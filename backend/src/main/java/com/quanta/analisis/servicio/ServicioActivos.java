package com.quanta.analisis.servicio;

import com.quanta.analisis.algoritmo.GeneradorDatos;
import com.quanta.analisis.dominio.modelo.Activo;
import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import com.quanta.analisis.dto.DtoActivo;
import com.quanta.analisis.dto.DtoEventoEtl;
import com.quanta.analisis.dto.DtoInformeLimpieza;
import com.quanta.analisis.excepcion.ExcepcionActivoNoEncontrado;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * Servicio principal de gestión de activos financieros.
 *
 * Orquesta el pipeline ETL (Extract, Transform, Load) al arrancar el servidor:
 *   1. Extract: intenta descargar datos reales desde Yahoo Finance v8 API
 *   2. Transform: limpia y valida cada serie (gaps, anomalías OHLCV)
 *   3. Load: almacena las series en memoria para consultas eficientes O(1)
 *
 * Estrategia de fallback: si la descarga de Yahoo Finance falla (por red, rate-limit
 * o símbolo no disponible), el activo usa datos sintéticos del generador PRNG mulberry32.
 * El campo dataSource registra la fuente real de cada activo.
 *
 * Los 20 activos incluyen:
 *   - 10 de la BVC (Bolsa de Valores de Colombia): ECOPETROL, ISA, GEB, etc.
 *   - 4 ETFs internacionales: VOO, CSPX, QQQ, SPY
 *   - 6 acciones de EE.UU.: AAPL, MSFT, NVDA, TSLA, JPM, XOM
 *
 * Inyección de dependencias:
 *   - GeneradorDatos: inyectado por constructor (requerido siempre)
 *   - ServicioYahooFinance: inyectado por setter con required=false (opcional; null en tests)
 *   - ServicioLimpiezaDatos: inyectado por setter con required=false (opcional; null en tests)
 */
@Slf4j
@Service
public class ServicioActivos {

    /** Número de días de negociación a generar con PRNG (~5 años: 252 días/año × 5) */
    private static final int DIAS_NEGOCIACION = 1260;

    // ── Dependencias ────────────────────────────────────────────────────────────

    /** Generador de series OHLCV deterministas (requerido, siempre disponible) */
    private final GeneradorDatos generadorDatos;

    /**
     * Servicio de descarga desde Yahoo Finance (opcional).
     * Se inyecta con required=false para que las pruebas unitarias puedan
     * instanciar ServicioActivos directamente sin Spring, en cuyo caso será null
     * y el sistema usará PRNG para todos los activos.
     */
    private ServicioYahooFinance servicioYahooFinance;

    /**
     * Servicio de limpieza de datos (opcional, igual que ServicioYahooFinance).
     */
    private ServicioLimpiezaDatos servicioLimpiezaDatos;

    // ── Estado interno ───────────────────────────────────────────────────────────

    /**
     * Mapa de activos ordenado por inserción (mismo orden de definición).
     * LinkedHashMap preserva el orden de los 20 activos para reportes consistentes.
     */
    private final Map<String, Activo> mapaActivos = new LinkedHashMap<>();

    /**
     * Cache de series OHLCV cargadas al arranque.
     * ConcurrentHashMap permite lecturas concurrentes sin bloqueos.
     */
    private final Map<String, List<BarraOhlcv>> mapaSeries = new ConcurrentHashMap<>();

    /** Fuente de datos por activo: "YAHOO_FINANCE" o "PRNG_FALLBACK" */
    private final Map<String, String> fuenteDatos = new ConcurrentHashMap<>();

    /** Informes de limpieza por activo (solo para activos con datos de Yahoo Finance) */
    private final Map<String, DtoInformeLimpieza> informesLimpieza = new ConcurrentHashMap<>();

    private long   tiempoGeneracionMs;
    private String ultimaEjecucion;

    // ── Constructor y setters de inyección ──────────────────────────────────────

    public ServicioActivos(GeneradorDatos generadorDatos) {
        this.generadorDatos = generadorDatos;
    }

    @Autowired(required = false)
    public void setServicioYahooFinance(ServicioYahooFinance servicioYahooFinance) {
        this.servicioYahooFinance = servicioYahooFinance;
    }

    @Autowired(required = false)
    public void setServicioLimpiezaDatos(ServicioLimpiezaDatos servicioLimpiezaDatos) {
        this.servicioLimpiezaDatos = servicioLimpiezaDatos;
    }

    // ── Inicialización ETL ───────────────────────────────────────────────────────

    /**
     * Inicializa el pipeline ETL al arrancar el servidor.
     *
     * @PostConstruct garantiza que se ejecute después de que Spring haya inyectado
     * todas las dependencias (incluidos los setters opcionales).
     *
     * Para cada activo:
     *   1. Si hay ServicioYahooFinance disponible y el activo tiene tickerYahoo,
     *      intenta la descarga real (con reintentos y timeout)
     *   2. Si la descarga real falla (o no está configurada), usa el generador PRNG
     *   3. Registra la fuente de datos y el informe de limpieza en los mapas internos
     */
    @PostConstruct
    void inicializar() {
        boolean yahooDisponible = servicioYahooFinance != null && servicioLimpiezaDatos != null;
        log.info("Iniciando ETL para {} activos [Yahoo Finance: {}]",
                definicionesActivos().size(), yahooDisponible ? "habilitado" : "deshabilitado (PRNG)");
        long inicio = System.currentTimeMillis();

        for (Activo definicion : definicionesActivos()) {
            mapaActivos.put(definicion.getTicker(), definicion);
            List<BarraOhlcv> serie = descargarConFallback(definicion, yahooDisponible);
            mapaSeries.put(definicion.getTicker(), serie);
            log.debug("  {} → {} barras [{}]", definicion.getTicker(), serie.size(),
                    fuenteDatos.getOrDefault(definicion.getTicker(), "?"));
        }

        tiempoGeneracionMs = System.currentTimeMillis() - inicio;
        ultimaEjecucion    = java.time.LocalDateTime.now().toString();

        int totalBarras = mapaSeries.values().stream().mapToInt(List::size).sum();
        long exitosos   = fuenteDatos.values().stream().filter("YAHOO_FINANCE"::equals).count();
        log.info("ETL completado: {} activos ({} Yahoo Finance, {} PRNG), {} observaciones, {}ms",
                mapaActivos.size(), exitosos, mapaActivos.size() - exitosos,
                totalBarras, tiempoGeneracionMs);
    }

    /**
     * Intenta descargar datos reales de Yahoo Finance; si falla, usa PRNG.
     *
     * Decisión de fallback justificada algorítmicamente:
     *   - Preserva disponibilidad del sistema ante fallos de red o de la API
     *   - Los datos PRNG son deterministas y reproducibles (misma semilla → misma serie)
     *   - El campo dataSource en DtoActivo permite al cliente distinguir el origen
     */
    private List<BarraOhlcv> descargarConFallback(Activo activo, boolean yahooDisponible) {
        String tickerYahoo = activo.getTickerYahoo();

        if (yahooDisponible && tickerYahoo != null && !tickerYahoo.isBlank()) {
            try {
                List<BarraOhlcv> serie = servicioYahooFinance.descargarSerie(tickerYahoo);
                ServicioLimpiezaDatos.ResultadoLimpieza resultado =
                        servicioLimpiezaDatos.limpiar(activo.getTicker(), serie);
                informesLimpieza.put(activo.getTicker(), resultado.informe());
                fuenteDatos.put(activo.getTicker(), "YAHOO_FINANCE");
                return resultado.serie();
            } catch (Exception e) {
                log.warn("Yahoo Finance falló para {} ({}): {}. Usando PRNG fallback.",
                        activo.getTicker(), tickerYahoo, e.getMessage());
            }
        }

        // Fallback: datos sintéticos deterministas con PRNG mulberry32
        fuenteDatos.put(activo.getTicker(), "PRNG_FALLBACK");
        return generadorDatos.generarSerie(
                activo.getSemilla(), activo.getPrecioInicial(),
                DIAS_NEGOCIACION, activo.getDrift(), activo.getVolatilidad());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSULTAS DE ACTIVOS
    // ═══════════════════════════════════════════════════════════════════════════

    public List<DtoActivo> obtenerTodosActivos() {
        return mapaActivos.values().stream()
                .map(this::convertirADto)
                .collect(Collectors.toList());
    }

    public Activo obtenerActivo(String ticker) {
        Activo activo = mapaActivos.get(ticker.toUpperCase());
        if (activo == null) throw new ExcepcionActivoNoEncontrado(ticker);
        return activo;
    }

    public DtoActivo obtenerDtoActivo(String ticker) {
        return convertirADto(obtenerActivo(ticker));
    }

    public List<BarraOhlcv> obtenerSerie(String ticker) {
        ticker = ticker.toUpperCase();
        if (!mapaSeries.containsKey(ticker)) throw new ExcepcionActivoNoEncontrado(ticker);
        return Collections.unmodifiableList(mapaSeries.get(ticker));
    }

    public List<BarraOhlcv> obtenerSerie(String ticker, int dias) {
        List<BarraOhlcv> completa = obtenerSerie(ticker);
        if (dias <= 0 || dias >= completa.size()) return completa;
        return completa.subList(completa.size() - dias, completa.size());
    }

    public double[] obtenerPreciosCierre(String ticker) {
        return obtenerSerie(ticker).stream().mapToDouble(BarraOhlcv::getCierre).toArray();
    }

    public double[] obtenerPreciosCierre(String ticker, int dias) {
        return obtenerSerie(ticker, dias).stream().mapToDouble(BarraOhlcv::getCierre).toArray();
    }

    public List<String> obtenerTickers() {
        return new ArrayList<>(mapaActivos.keySet());
    }

    // ── Getters de estado ETL ───────────────────────────────────────────────────

    public long   getTiempoGeneracionMs() { return tiempoGeneracionMs; }
    public String getUltimaEjecucion()    { return ultimaEjecucion; }

    public int totalObservaciones() {
        return mapaSeries.values().stream().mapToInt(List::size).sum();
    }

    public Map<String, Integer> barrasPorActivo() {
        return mapaSeries.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().size()));
    }

    /** @return Mapa ticker → fuente ("YAHOO_FINANCE" o "PRNG_FALLBACK") */
    public Map<String, String> getFuenteDatos() {
        return Collections.unmodifiableMap(fuenteDatos);
    }

    /** @return Mapa ticker → informe de limpieza (solo activos con Yahoo Finance) */
    public Map<String, DtoInformeLimpieza> getInformesLimpieza() {
        return Collections.unmodifiableMap(informesLimpieza);
    }

    // ── Actualización de datos ──────────────────────────────────────────────────

    public void actualizarDatos() {
        log.info("Actualización de datos solicitada vía API...");
        mapaSeries.clear();
        fuenteDatos.clear();
        informesLimpieza.clear();
        inicializar();
    }

    /**
     * Reinicializa el pipeline ETL procesando cada activo de forma secuencial
     * e invocando el callback después de cargar cada uno.
     *
     * Permite que el endpoint SSE emita un evento por activo para que el
     * frontend muestre el progreso en tiempo real.
     *
     * @param callback Función invocada con DtoEventoEtl tras cargar cada activo
     */
    public void reinicializarConCallback(Consumer<DtoEventoEtl> callback) {
        log.info("Pipeline ETL con streaming iniciado...");
        mapaSeries.clear();
        fuenteDatos.clear();
        informesLimpieza.clear();

        boolean yahooDisponible = servicioYahooFinance != null && servicioLimpiezaDatos != null;
        long inicio = System.currentTimeMillis();
        List<Activo> activos = definicionesActivos();
        int indice = 0;

        for (Activo definicion : activos) {
            indice++;
            mapaActivos.put(definicion.getTicker(), definicion);
            List<BarraOhlcv> serie = descargarConFallback(definicion, yahooDisponible);
            mapaSeries.put(definicion.getTicker(), serie);

            int desde = Math.max(0, serie.size() - 60);
            List<Double> precios = serie.subList(desde, serie.size())
                    .stream()
                    .map(BarraOhlcv::getCierre)
                    .collect(Collectors.toList());

            double ultimoCierre = serie.isEmpty() ? 0.0 : serie.get(serie.size() - 1).getCierre();
            String fuente = fuenteDatos.getOrDefault(definicion.getTicker(), "PRNG_FALLBACK");

            DtoEventoEtl evento = DtoEventoEtl.builder()
                    .tipo("activo")
                    .ticker(definicion.getTicker())
                    .nombre(definicion.getNombre())
                    .mercado(definicion.getMercado())
                    .sector(definicion.getSector())
                    .fuente(fuente)
                    .barras(serie.size())
                    .ultimoCierre(ultimoCierre)
                    .precios(precios)
                    .progreso(indice)
                    .total(activos.size())
                    .build();

            callback.accept(evento);
            log.debug("  [stream] {} ({}/{}) → {} barras [{}]",
                    definicion.getTicker(), indice, activos.size(), serie.size(), fuente);
        }

        tiempoGeneracionMs = System.currentTimeMillis() - inicio;
        ultimaEjecucion    = java.time.LocalDateTime.now().toString();

        int totalBarras = mapaSeries.values().stream().mapToInt(List::size).sum();
        long exitosos   = fuenteDatos.values().stream().filter("YAHOO_FINANCE"::equals).count();
        log.info("ETL stream completado: {} activos ({} Yahoo, {} PRNG), {} barras, {}ms",
                mapaActivos.size(), exitosos, mapaActivos.size() - exitosos,
                totalBarras, tiempoGeneracionMs);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONVERSIÓN DE MODELO A DTO
    // ═══════════════════════════════════════════════════════════════════════════

    private DtoActivo convertirADto(Activo activo) {
        List<BarraOhlcv> serie = mapaSeries.get(activo.getTicker());
        double ultimoCierre = serie.isEmpty() ? 0 : serie.get(serie.size() - 1).getCierre();

        return DtoActivo.builder()
                .ticker(activo.getTicker())
                .name(activo.getNombre())
                .market(activo.getMercado())
                .sector(activo.getSector())
                .lastClose(ultimoCierre)
                .dataPoints(serie.size())
                .dataSource(fuenteDatos.getOrDefault(activo.getTicker(), "PRNG_FALLBACK"))
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DEFINICIÓN DE LOS 20 ACTIVOS CON TICKERS DE YAHOO FINANCE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Define la lista completa de los 20 activos con sus parámetros de generación PRNG
     * y sus tickers en Yahoo Finance para la descarga de datos reales.
     *
     * Tickers de Yahoo Finance para activos colombianos:
     *   - EC:   Ecopetrol S.A. ADR en NYSE (equivale a ECOPETROL en BVC)
     *   - CIB:  Bancolombia Pref. ADR en NYSE (equivale a PFBCOLOM en BVC)
     *   - AVAL: Grupo Aval Acciones ADR en NYSE (equivale a PFAVAL en BVC)
     *   - ISA, GEB, GRUPOSURA, NUTRESA, CEMARGOS, CELSIA, EXITO: tickers BVC directos;
     *     si Yahoo Finance no los encuentra, el fallback PRNG toma el control.
     *
     * Los parámetros PRNG (semilla, precioInicial, drift, volatilidad) están calibrados
     * para simular comportamientos realistas como fallback cuando Yahoo Finance falla.
     */
    private static List<Activo> definicionesActivos() {
        return List.of(
            // ── BVC — Bolsa de Valores de Colombia ─────────────────────────────
            Activo.builder().ticker("ECOPETROL").nombre("Ecopetrol S.A.").mercado("BVC").sector("Energía")
                    .tickerYahoo("EC")
                    .semilla(11).precioInicial(2150).drift(0.0002).volatilidad(0.022).build(),
            Activo.builder().ticker("ISA").nombre("Interconexión Eléctrica").mercado("BVC").sector("Utilities")
                    .tickerYahoo("ISA")
                    .semilla(12).precioInicial(18500).drift(0.0003).volatilidad(0.018).build(),
            Activo.builder().ticker("GEB").nombre("Grupo Energía Bogotá").mercado("BVC").sector("Utilities")
                    .tickerYahoo("GEB.CL")
                    .semilla(13).precioInicial(2680).drift(0.0001).volatilidad(0.016).build(),
            Activo.builder().ticker("PFBCOLOM").nombre("Bancolombia Pref.").mercado("BVC").sector("Financiero")
                    .tickerYahoo("CIB")
                    .semilla(14).precioInicial(32000).drift(0.0004).volatilidad(0.020).build(),
            Activo.builder().ticker("GRUPOSURA").nombre("Grupo SURA").mercado("BVC").sector("Financiero")
                    .tickerYahoo("GRUPOSURA.CL")
                    .semilla(15).precioInicial(23800).drift(0.0002).volatilidad(0.019).build(),
            Activo.builder().ticker("NUTRESA").nombre("Grupo Nutresa").mercado("BVC").sector("Consumo")
                    .tickerYahoo("NUTRESA.CL")
                    .semilla(16).precioInicial(73000).drift(0.0001).volatilidad(0.014).build(),
            Activo.builder().ticker("CEMARGOS").nombre("Cementos Argos").mercado("BVC").sector("Materiales")
                    .tickerYahoo("CEMARGOS.CL")
                    .semilla(17).precioInicial(4500).drift(0.0002).volatilidad(0.024).build(),
            Activo.builder().ticker("PFAVAL").nombre("Grupo Aval Pref.").mercado("BVC").sector("Financiero")
                    .tickerYahoo("AVAL")
                    .semilla(18).precioInicial(1130).drift(0.0001).volatilidad(0.017).build(),
            Activo.builder().ticker("CELSIA").nombre("Celsia S.A.").mercado("BVC").sector("Utilities")
                    .tickerYahoo("CELSIA.CL")
                    .semilla(19).precioInicial(3550).drift(0.0003).volatilidad(0.020).build(),
            Activo.builder().ticker("EXITO").nombre("Almacenes Éxito").mercado("BVC").sector("Consumo")
                    .tickerYahoo("EXTO.CL")
                    .semilla(20).precioInicial(4800).drift(-0.0001).volatilidad(0.025).build(),

            // ── ETFs Internacionales ────────────────────────────────────────────
            Activo.builder().ticker("VOO").nombre("Vanguard S&P 500 ETF").mercado("AMEX").sector("Index ETF")
                    .tickerYahoo("VOO")
                    .semilla(21).precioInicial(410).drift(0.0006).volatilidad(0.011).build(),
            Activo.builder().ticker("CSPX").nombre("iShares Core S&P 500").mercado("AMEX").sector("Index ETF")
                    .tickerYahoo("CSPX.L")
                    .semilla(22).precioInicial(480).drift(0.0006).volatilidad(0.011).build(),
            Activo.builder().ticker("QQQ").nombre("Invesco QQQ Trust").mercado("NASDAQ").sector("Index ETF")
                    .tickerYahoo("QQQ")
                    .semilla(23).precioInicial(360).drift(0.0008).volatilidad(0.015).build(),
            Activo.builder().ticker("SPY").nombre("SPDR S&P 500 ETF").mercado("AMEX").sector("Index ETF")
                    .tickerYahoo("SPY")
                    .semilla(24).precioInicial(415).drift(0.0006).volatilidad(0.011).build(),

            // ── Tecnología y Finanzas — EE.UU. ─────────────────────────────────
            Activo.builder().ticker("AAPL").nombre("Apple Inc.").mercado("NASDAQ").sector("Tecnología")
                    .tickerYahoo("AAPL")
                    .semilla(25).precioInicial(165).drift(0.0008).volatilidad(0.018).build(),
            Activo.builder().ticker("MSFT").nombre("Microsoft").mercado("NASDAQ").sector("Tecnología")
                    .tickerYahoo("MSFT")
                    .semilla(26).precioInicial(320).drift(0.0009).volatilidad(0.016).build(),
            Activo.builder().ticker("NVDA").nombre("NVIDIA").mercado("NASDAQ").sector("Tecnología")
                    .tickerYahoo("NVDA")
                    .semilla(27).precioInicial(280).drift(0.0018).volatilidad(0.032).build(),
            Activo.builder().ticker("TSLA").nombre("Tesla").mercado("NASDAQ").sector("Automotriz")
                    .tickerYahoo("TSLA")
                    .semilla(28).precioInicial(240).drift(0.0005).volatilidad(0.038).build(),
            Activo.builder().ticker("JPM").nombre("JPMorgan Chase").mercado("NYSE").sector("Financiero")
                    .tickerYahoo("JPM")
                    .semilla(29).precioInicial(145).drift(0.0004).volatilidad(0.014).build(),
            Activo.builder().ticker("XOM").nombre("Exxon Mobil").mercado("NYSE").sector("Energía")
                    .tickerYahoo("XOM")
                    .semilla(30).precioInicial(105).drift(0.0003).volatilidad(0.017).build()
        );
    }
}
