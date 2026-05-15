package com.quanta.analisis.servicio;

import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import com.quanta.analisis.dto.DtoInformeLimpieza;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio de limpieza y validación de series OHLCV.
 *
 * Implementa los algoritmos del paso "Transform" del pipeline ETL:
 *   1. Detección de gaps (días hábiles faltantes entre barras consecutivas)
 *   2. Interpolación lineal para rellenar valores faltantes
 *   3. Detección de anomalías OHLCV (incoherencias entre precios)
 *   4. Corrección de anomalías: garantiza High ≥ max(Open,Close) y Low ≤ min(Open,Close)
 *   5. Alineación de calendarios entre múltiples series (intersección de fechas comunes)
 *
 * Justificación de decisiones algorítmicas:
 *   - Interpolación lineal (gaps cortos): mínima distorsión para 1-3 días festivos
 *   - Corrección OHLCV (no eliminación): preserva la serie completa sin pérdida de datos
 *   - Intersección de calendarios (no unión): evita sesgo al comparar series de distintos mercados
 */
@Slf4j
@Service
public class ServicioLimpiezaDatos {

    /**
     * Ejecuta el pipeline completo de limpieza sobre una serie OHLCV.
     *
     * Pasos en orden:
     *   1. Detectar gaps (días hábiles faltantes)
     *   2. Interpolar barras para cubrir gaps detectados
     *   3. Detectar y corregir anomalías OHLCV
     *
     * Complejidad total: O(n) donde n = número de barras de la serie
     *
     * @param ticker Ticker del activo (para el informe de limpieza)
     * @param serie  Serie OHLCV a limpiar, en cualquier orden
     * @return ResultadoLimpieza con la serie limpia y el informe detallado
     */
    public ResultadoLimpieza limpiar(String ticker, List<BarraOhlcv> serie) {
        int barrasOriginales = serie.size();

        // Paso 1: Detectar gaps en la serie
        List<String> gapsDetectados = detectarGaps(serie);

        // Paso 2: Interpolar barras para cubrir gaps (si hay alguno)
        List<BarraOhlcv> serieInterpolada = gapsDetectados.isEmpty()
                ? new ArrayList<>(serie)
                : interpolarFaltantes(serie);

        // Paso 3: Detectar y corregir anomalías OHLCV
        List<Integer> anomalias       = detectarAnomalias(serieInterpolada);
        List<BarraOhlcv> serieCorregida = anomalias.isEmpty()
                ? serieInterpolada
                : corregirAnomalias(serieInterpolada);

        DtoInformeLimpieza informe = DtoInformeLimpieza.builder()
                .ticker(ticker)
                .barrasOriginales(barrasOriginales)
                .barrasFinales(serieCorregida.size())
                .gapsDetectados(gapsDetectados.size())
                .gapsInterpolados(serieCorregida.size() - barrasOriginales)
                .anomaliasDetectadas(anomalias.size())
                .anomaliasCorregidas(anomalias.size())
                .metodologiaGaps("Interpolación lineal entre barras adyacentes; " +
                        "volumen=0 para barras interpoladas (festivos/datos faltantes)")
                .metodologiaAnomalias("Recalcula High=max(H,O,C) y Low=min(L,O,C) " +
                        "para garantizar H≥max(O,C) y L≤min(O,C); Open y Close no se modifican")
                .build();

        log.debug("Limpieza [{}]: {} gaps interpolados, {} anomalías corregidas",
                ticker, gapsDetectados.size(), anomalias.size());
        return new ResultadoLimpieza(serieCorregida, informe);
    }

    /**
     * Detecta gaps en la serie: identifica los días hábiles (lun-vie) que faltan
     * entre barras consecutivas.
     *
     * Algoritmo con ventana deslizante O(n):
     *   Para cada par de barras (i-1, i), calcula el siguiente día hábil esperado
     *   después de la barra (i-1). Si la barra (i) tiene una fecha posterior al
     *   esperado, hay uno o más días hábiles faltantes entre ellas.
     *
     * Nota: No detecta festivos explícitamente (requeriría un calendario por mercado).
     * Detecta cualquier día hábil del calendario gregoriano que falte en la serie.
     *
     * Complejidad: O(n) donde n = número de barras
     *
     * @param serie Serie OHLCV ordenada cronológicamente ascendente
     * @return Lista de fechas ISO-8601 de los días hábiles faltantes detectados
     */
    public List<String> detectarGaps(List<BarraOhlcv> serie) {
        List<String> gaps = new ArrayList<>();
        for (int i = 1; i < serie.size(); i++) {
            LocalDate anterior = LocalDate.parse(serie.get(i - 1).getFecha());
            LocalDate actual   = LocalDate.parse(serie.get(i).getFecha());
            LocalDate esperado = siguienteDiaHabil(anterior);

            // Avanza por cada día hábil esperado que no aparece en la serie
            while (esperado.isBefore(actual)) {
                gaps.add(esperado.toString());
                esperado = siguienteDiaHabil(esperado);
            }
        }
        return gaps;
    }

    /**
     * Interpola barras faltantes usando interpolación lineal entre barras vecinas.
     *
     * Para cada gap detectado entre dos barras consecutivas (A y B), crea una barra
     * interpolada donde el precio de cierre es la interpolación lineal:
     *   cierre_interp = cierre_A + t × (cierre_B - cierre_A)
     *   donde t ∈ (0,1) = proporción del tiempo transcurrido entre A y B
     *
     * Las barras interpoladas tienen OHLC = cierre interpolado y volumen = 0.
     * Esto indica que son estimaciones (no barras reales de mercado).
     *
     * Justificación: La interpolación lineal es adecuada para gaps cortos (1-3 días
     * de festivos). Para gaps largos (>5 días) podría introducir sesgo, pero es
     * preferible a eliminar registros cuando la serie necesita densidad temporal.
     *
     * Complejidad: O(n + g) donde g = número total de días faltantes
     *
     * @param serie Serie OHLCV con posibles gaps, ordenada cronológicamente
     * @return Nueva lista con barras interpoladas añadidas, ordenada cronológicamente
     */
    public List<BarraOhlcv> interpolarFaltantes(List<BarraOhlcv> serie) {
        if (serie.size() < 2) return new ArrayList<>(serie);

        List<BarraOhlcv> resultado = new ArrayList<>(serie.size() + 20);

        for (int i = 0; i < serie.size(); i++) {
            resultado.add(serie.get(i));

            if (i < serie.size() - 1) {
                BarraOhlcv barraActual    = serie.get(i);
                BarraOhlcv barraSiguiente = serie.get(i + 1);
                LocalDate  fechaActual    = LocalDate.parse(barraActual.getFecha());
                LocalDate  fechaSiguiente = LocalDate.parse(barraSiguiente.getFecha());

                // Distancia en días entre los dos extremos del gap (para el factor t)
                long diasTotal = ChronoUnit.DAYS.between(fechaActual, fechaSiguiente);

                // Itera por cada día hábil faltante entre las dos barras
                LocalDate cursor = siguienteDiaHabil(fechaActual);
                while (cursor.isBefore(fechaSiguiente)) {
                    long diasCursor = ChronoUnit.DAYS.between(fechaActual, cursor);
                    // Factor de interpolación lineal t ∈ (0,1)
                    double t = diasTotal > 0 ? (double) diasCursor / diasTotal : 0.5;
                    double cierreInterp =
                            barraActual.getCierre() + t * (barraSiguiente.getCierre() - barraActual.getCierre());

                    resultado.add(BarraOhlcv.builder()
                            .fecha(cursor.toString())
                            .apertura(cierreInterp)
                            .maximo(cierreInterp)
                            .minimo(cierreInterp)
                            .cierre(cierreInterp)
                            .volumen(0L)            // Volumen 0 indica barra interpolada
                            .build());

                    cursor = siguienteDiaHabil(cursor);
                }
            }
        }

        resultado.sort(Comparator.comparing(BarraOhlcv::getFecha));
        return resultado;
    }

    /**
     * Detecta anomalías en las barras OHLCV: registros con precios incoherentes.
     *
     * Condiciones de anomalía detectadas:
     *   - High < Low (precio máximo menor que mínimo — físicamente imposible)
     *   - Open, Close, High o Low ≤ 0 (precios negativos o cero)
     *   - High < Open o High < Close (el máximo no puede ser menor que apertura/cierre)
     *   - Low > Open o Low > Close (el mínimo no puede ser mayor que apertura/cierre)
     *
     * Estas anomalías pueden ocurrir por errores en la fuente de datos, splits de acciones
     * no procesados correctamente, o errores de transmisión en la API.
     *
     * Complejidad: O(n)
     *
     * @param serie Serie OHLCV a validar
     * @return Lista de índices (posiciones 0-based) de barras con anomalías
     */
    public List<Integer> detectarAnomalias(List<BarraOhlcv> serie) {
        List<Integer> indices = new ArrayList<>();
        for (int i = 0; i < serie.size(); i++) {
            BarraOhlcv b = serie.get(i);
            boolean anomalia =
                    b.getMaximo()   < b.getMinimo()    ||
                    b.getApertura() <= 0               ||
                    b.getCierre()   <= 0               ||
                    b.getMaximo()   < b.getApertura()  ||
                    b.getMaximo()   < b.getCierre()    ||
                    b.getMinimo()   > b.getApertura()  ||
                    b.getMinimo()   > b.getCierre();
            if (anomalia) indices.add(i);
        }
        return indices;
    }

    /**
     * Corrige anomalías OHLCV ajustando High y Low para garantizar coherencia.
     *
     * Técnica de corrección:
     *   - High corregido = max(High_original, Open, Close)
     *   - Low corregido  = min(Low_original, Open, Close)
     *
     * No modifica Open ni Close (son los precios más significativos para el análisis).
     * Si High y Low ya son correctos, retorna la barra original sin crear objetos nuevos.
     *
     * Complejidad: O(n)
     *
     * @param serie Serie con posibles anomalías OHLCV
     * @return Nueva lista con las barras corregidas (inmutabilidad: no modifica la entrada)
     */
    public List<BarraOhlcv> corregirAnomalias(List<BarraOhlcv> serie) {
        return serie.stream().map(b -> {
            double h = Math.max(b.getMaximo(),  Math.max(b.getApertura(), b.getCierre()));
            double l = Math.min(b.getMinimo(), Math.min(b.getApertura(), b.getCierre()));
            // Solo crea objeto nuevo si hay corrección necesaria
            if (h == b.getMaximo() && l == b.getMinimo()) return b;
            return BarraOhlcv.builder()
                    .fecha(b.getFecha())
                    .apertura(b.getApertura())
                    .maximo(h)
                    .minimo(l)
                    .cierre(b.getCierre())
                    .volumen(b.getVolumen())
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Alinea múltiples series al conjunto de fechas comunes entre todos los activos
     * (intersección de calendarios bursátiles).
     *
     * Problema: distintos mercados (BVC Colombia, NYSE, LSE, NASDAQ) tienen calendarios
     * de festivos diferentes. Al analizar similitud o correlación entre activos de distintos
     * mercados, las series deben tener exactamente las mismas fechas para que las posiciones
     * i-ésimas de cada array correspondan al mismo día.
     *
     * Solución: retiene solo las fechas presentes en TODAS las series (intersección).
     * Impacto: reduce levemente el tamaño de cada serie, pero garantiza comparabilidad.
     *
     * Alternativa considerada: unión de calendarios (relleno de faltantes). Se descarta
     * porque introduce mayor incertidumbre al interpolar precios de mercados abiertos
     * usando valores de mercados cerrados.
     *
     * Complejidad: O(k·n) donde k = número de series, n = tamaño promedio de serie
     *
     * @param series Mapa ticker → serie OHLCV (series pueden tener fechas distintas)
     * @return Mapa ticker → serie OHLCV con solo las fechas comunes a todas las series
     */
    public Map<String, List<BarraOhlcv>> alinearCalendarios(Map<String, List<BarraOhlcv>> series) {
        if (series.isEmpty()) return series;

        // Inicializa la intersección con todas las fechas de la primera serie
        Iterator<List<BarraOhlcv>> iter = series.values().iterator();
        Set<String> fechasComunes = new HashSet<>(
                iter.next().stream().map(BarraOhlcv::getFecha).collect(Collectors.toSet()));

        // Intersecta con las fechas de cada serie restante
        while (iter.hasNext()) {
            Set<String> fechasSerie = iter.next().stream()
                    .map(BarraOhlcv::getFecha)
                    .collect(Collectors.toSet());
            fechasComunes.retainAll(fechasSerie);
        }

        if (fechasComunes.isEmpty()) {
            log.warn("Intersección de calendarios vacía — las series no tienen fechas en común");
            return series;
        }

        final Set<String> comunes = fechasComunes;
        Map<String, List<BarraOhlcv>> alineadas = new LinkedHashMap<>();

        for (Map.Entry<String, List<BarraOhlcv>> entry : series.entrySet()) {
            List<BarraOhlcv> filtrada = entry.getValue().stream()
                    .filter(b -> comunes.contains(b.getFecha()))
                    .sorted(Comparator.comparing(BarraOhlcv::getFecha))
                    .collect(Collectors.toList());
            alineadas.put(entry.getKey(), filtrada);
        }

        log.debug("Calendarios alineados: {} fechas comunes entre {} series",
                fechasComunes.size(), series.size());
        return alineadas;
    }

    // ── Utilidad privada ─────────────────────────────────────────────────────────

    /**
     * Calcula el siguiente día hábil (lunes a viernes) después de la fecha dada.
     * No considera festivos específicos de cada mercado; solo omite sábados y domingos.
     *
     * @param fecha Fecha base
     * @return Primer día lunes-viernes siguiente a la fecha dada
     */
    private LocalDate siguienteDiaHabil(LocalDate fecha) {
        LocalDate siguiente = fecha.plusDays(1);
        while (siguiente.getDayOfWeek() == DayOfWeek.SATURDAY ||
               siguiente.getDayOfWeek() == DayOfWeek.SUNDAY) {
            siguiente = siguiente.plusDays(1);
        }
        return siguiente;
    }

    // ── Tipo de resultado ────────────────────────────────────────────────────────

    /** Contenedor inmutable que agrupa la serie limpia y el informe de limpieza */
    public record ResultadoLimpieza(List<BarraOhlcv> serie, DtoInformeLimpieza informe) {}
}
