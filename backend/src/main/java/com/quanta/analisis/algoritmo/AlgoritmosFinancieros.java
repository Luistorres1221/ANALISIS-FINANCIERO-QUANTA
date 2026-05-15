package com.quanta.analisis.algoritmo;

import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Biblioteca de algoritmos financieros implementados en Java puro, sin librerías externas.
 *
 * Contiene todos los cálculos necesarios para el análisis cuantitativo de activos:
 *   - Retornos simples diarios
 *   - Estadísticas descriptivas (media, desviación estándar)
 *   - Métricas de portfolio (volatilidad anualizada, CAGR)
 *   - Algoritmos de similitud (Pearson, Coseno, Euclidiana, DTW)
 *   - Media Móvil Simple (SMA)
 *   - Detección de patrones técnicos (rachas alcistas, patrones V)
 *   - Clasificación de riesgo
 *
 * Es un puerto fiel del módulo TypeScript del frontend para garantizar
 * que los cálculos del backend coincidan exactamente con los del frontend.
 *
 * @Component lo registra como componente Spring para inyección en servicios.
 */
@Component
public class AlgoritmosFinancieros {

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 1: CÁLCULO DE RETORNOS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula los retornos simples diarios a partir de una serie de barras OHLCV.
     *
     * Retorno simple: r_t = (Precio_t - Precio_{t-1}) / Precio_{t-1}
     * Ejemplo: si ayer cerró en 100 y hoy en 103, el retorno es (103-100)/100 = 0.03 = 3%
     *
     * @param serie Lista de barras OHLCV en orden cronológico
     * @return Array de retornos (longitud = serie.size() - 1)
     */
    public double[] calcularRetornos(List<BarraOhlcv> serie) {
        // El número de retornos es uno menos que el número de precios
        double[] retornos = new double[serie.size() - 1];
        for (int i = 1; i < serie.size(); i++) {
            // Retorno del día i respecto al día anterior i-1
            retornos[i - 1] = (serie.get(i).getCierre() - serie.get(i - 1).getCierre())
                               / serie.get(i - 1).getCierre();
        }
        return retornos;
    }

    /**
     * Calcula los retornos simples a partir de un array de precios directamente.
     * Útil cuando ya se tienen los precios extraídos de la serie.
     *
     * @param precios Array de precios de cierre en orden cronológico
     * @return Array de retornos (longitud = precios.length - 1)
     */
    public double[] retornosDesdePrecids(double[] precios) {
        double[] retornos = new double[precios.length - 1];
        for (int i = 1; i < precios.length; i++) {
            retornos[i - 1] = (precios[i] - precios[i - 1]) / precios[i - 1];
        }
        return retornos;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 2: ESTADÍSTICAS BÁSICAS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula la media aritmética (promedio) de un array de valores.
     * Media = suma de todos los valores / cantidad de valores
     *
     * @param valores Array de números reales
     * @return Media aritmética del array
     */
    public double media(double[] valores) {
        double suma = 0;
        // Suma todos los elementos del array
        for (double x : valores) suma += x;
        // Divide por la cantidad total de elementos
        return suma / valores.length;
    }

    /**
     * Calcula la desviación estándar muestral de un array de valores.
     *
     * Usa el divisor (n-1) en lugar de n, conocido como "corrección de Bessel":
     * esto produce una estimación insesgada de la desviación de la población
     * a partir de una muestra finita de datos.
     *
     * @param valores Array de números reales (mínimo 2 elementos)
     * @return Desviación estándar muestral (raíz cuadrada de la varianza muestral)
     */
    public double desviacionEstandar(double[] valores) {
        double m = media(valores);  // Calcula la media primero
        double sumaCuadrados = 0;
        // Suma de los cuadrados de las diferencias respecto a la media
        for (double x : valores) sumaCuadrados += (x - m) * (x - m);
        // Divide por (n-1) y saca raíz cuadrada — corrección de Bessel para muestras
        return Math.sqrt(sumaCuadrados / (valores.length - 1));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 3: MÉTRICAS DE PORTFOLIO
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula la volatilidad histórica anualizada de un activo.
     *
     * Fórmula: σ_anual = σ_diaria × √252
     * - σ_diaria: desviación estándar de los retornos diarios
     * - 252: número de días de negociación en un año bursátil típico
     * - La multiplicación por √252 convierte la volatilidad diaria a anual
     *
     * Ejemplo: σ_diaria = 1.5% → σ_anual = 1.5% × √252 ≈ 23.8%
     *
     * @param serie Serie completa de barras OHLCV del activo
     * @return Volatilidad anualizada como decimal (p.ej. 0.238 = 23.8%)
     */
    public double volatiliadadAnualizada(List<BarraOhlcv> serie) {
        // Calcula retornos diarios, luego su desviación estándar, luego anualiza
        return desviacionEstandar(calcularRetornos(serie)) * Math.sqrt(252);
    }

    /**
     * Calcula el CAGR (Compound Annual Growth Rate) — Tasa de Crecimiento Anual Compuesta.
     *
     * Fórmula: CAGR = (PrecioFinal / PrecioInicial)^(1/años) - 1
     *
     * El CAGR responde a: "¿a qué tasa constante anual habría tenido que crecer
     * el activo para ir del precio inicial al precio final?"
     *
     * Ejemplo: de 100 a 161 en 4 años → CAGR = (161/100)^(1/4) - 1 ≈ 12.7% anual
     *
     * @param serie Serie completa de barras OHLCV del activo
     * @return CAGR como decimal (p.ej. 0.127 = 12.7% anual)
     */
    public double tasaCrecimientoAnual(List<BarraOhlcv> serie) {
        double precioInicial = serie.get(0).getCierre();                         // Primer precio
        double precioFinal   = serie.get(serie.size() - 1).getCierre();         // Último precio
        double anos          = serie.size() / 252.0;                            // Años totales
        // Fórmula del CAGR: (Final/Inicial)^(1/años) - 1
        return Math.pow(precioFinal / precioInicial, 1.0 / anos) - 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 4: ALGORITMOS DE SIMILITUD
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula la Correlación de Pearson entre dos series de retornos.
     *
     * Mide la relación lineal entre dos variables. Rango: [-1, 1]
     *   +1.0: correlación positiva perfecta (se mueven exactamente igual)
     *    0.0: sin relación lineal (independientes)
     *   -1.0: correlación negativa perfecta (cuando uno sube, el otro baja)
     *
     * Fórmula: r = Σ[(x_i - x̄)(y_i - ȳ)] / √[Σ(x_i-x̄)² × Σ(y_i-ȳ)²]
     *
     * Si las series tienen diferente longitud, usa los últimos N días del más largo
     * (alineación por el extremo más reciente, como es estándar en finanzas).
     *
     * @param a Array de retornos del activo A
     * @param b Array de retornos del activo B
     * @return Correlación de Pearson en [-1, 1]
     */
    public double correlacionPearson(double[] a, double[] b) {
        // Toma el mínimo de longitudes para alinear las series
        int n = Math.min(a.length, b.length);
        // Extrae los últimos n elementos de cada serie (los más recientes)
        double[] rebanadaA = Arrays.copyOfRange(a, a.length - n, a.length);
        double[] rebanadaB = Arrays.copyOfRange(b, b.length - n, b.length);

        double mediaA = media(rebanadaA);
        double mediaB = media(rebanadaB);

        double numerador = 0;   // Covarianza acumulada
        double cuadA = 0;       // Suma de cuadrados de A
        double cuadB = 0;       // Suma de cuadrados de B

        for (int i = 0; i < n; i++) {
            double desviacionA = rebanadaA[i] - mediaA;  // Desviación de A respecto a su media
            double desviacionB = rebanadaB[i] - mediaB;  // Desviación de B respecto a su media
            numerador += desviacionA * desviacionB;        // Acumula el producto cruzado
            cuadA     += desviacionA * desviacionA;        // Acumula el cuadrado de A
            cuadB     += desviacionB * desviacionB;        // Acumula el cuadrado de B
        }
        // Divide el numerador por la raíz del producto de las varianzas
        return numerador / Math.sqrt(cuadA * cuadB);
    }

    /**
     * Calcula la Similitud Coseno entre dos vectores de precios.
     *
     * Mide el ángulo entre dos vectores en el espacio n-dimensional.
     * A diferencia de Pearson, no centra los datos, sino que compara
     * la "dirección" de los precios en bruto.
     *
     * Rango: [0, 1] para precios positivos.
     * Valores cercanos a 1 indican que los precios apuntan en la misma dirección.
     *
     * Fórmula: coseno(A,B) = (A·B) / (||A|| × ||B||)
     * donde A·B es el producto punto y ||A|| es la norma euclidiana de A.
     *
     * @param a Array de precios de cierre del activo A
     * @param b Array de precios de cierre del activo B
     * @return Similitud coseno en [0, 1]
     */
    public double similitudCoseno(double[] a, double[] b) {
        int n = Math.min(a.length, b.length);  // Longitud mínima para alinear
        double productoPunto = 0;  // Suma de productos elemento a elemento
        double normaA = 0;         // Suma de cuadrados de A (para la norma)
        double normaB = 0;         // Suma de cuadrados de B (para la norma)

        for (int i = 0; i < n; i++) {
            double x = a[a.length - n + i];  // Precio de A (alineado desde el final)
            double y = b[b.length - n + i];  // Precio de B (alineado desde el final)
            productoPunto += x * y;           // Acumula el producto punto A·B
            normaA        += x * x;           // Acumula x² para ||A||
            normaB        += y * y;           // Acumula y² para ||B||
        }
        // Divide el producto punto por el producto de las normas
        return productoPunto / (Math.sqrt(normaA) * Math.sqrt(normaB));
    }

    /**
     * Calcula la Distancia Euclidiana entre dos series de precios normalizadas.
     *
     * Para que la comparación sea independiente de la escala de precios
     * (un activo puede costar $100 y otro $50,000), se aplica normalización
     * z-score a cada serie antes de calcular la distancia.
     *
     * z-score: z_i = (x_i - media) / desviación_estándar
     * Esto centra los datos en 0 con desviación estándar 1.
     *
     * Distancia euclidiana: d = √[Σ(z_A_i - z_B_i)²]
     *
     * Rango: [0, ∞). Valores más pequeños = mayor similitud de forma.
     *
     * @param a Array de precios de cierre del activo A
     * @param b Array de precios de cierre del activo B
     * @return Distancia euclidiana entre los vectores z-score
     */
    public double distanciaEuclidiana(double[] a, double[] b) {
        int n = Math.min(a.length, b.length);

        // Extrae y normaliza los últimos n elementos de cada serie
        double[] A = Arrays.copyOfRange(a, a.length - n, a.length);
        double[] B = Arrays.copyOfRange(b, b.length - n, b.length);

        // Calcula estadísticas para la normalización z-score
        double mediaA = media(A), desviacionA = desviacionEstandar(A);
        double mediaB = media(B), desviacionB = desviacionEstandar(B);

        double sumaCuadrados = 0;
        for (int i = 0; i < n; i++) {
            // Normaliza cada precio por z-score: (valor - media) / desviación
            double zA = (A[i] - mediaA) / desviacionA;  // z-score de A en posición i
            double zB = (B[i] - mediaB) / desviacionB;  // z-score de B en posición i
            // Acumula el cuadrado de la diferencia
            sumaCuadrados += (zA - zB) * (zA - zB);
        }
        return Math.sqrt(sumaCuadrados);  // Raíz de la suma de cuadrados = distancia
    }

    /**
     * Calcula la distancia DTW (Dynamic Time Warping) con banda Sakoe-Chiba.
     *
     * DTW es un algoritmo de programación dinámica que mide la similitud entre
     * dos series temporales, permitiendo "deformar" el eje del tiempo para
     * alinear patrones similares que ocurren con un pequeño desfase temporal.
     *
     * La banda Sakoe-Chiba restringe el desfase máximo permitido, mejorando
     * el rendimiento computacional de O(n²) a O(n×band).
     *
     * La tabla cost[i][j] se llena de izquierda a derecha y de arriba a abajo:
     * cada celda toma el mínimo de sus tres vecinos (arriba, izquierda, diagonal).
     *
     * @param a    Array de precios de cierre del activo A
     * @param b    Array de precios de cierre del activo B
     * @param banda Ancho máximo de desfase permitido (default 20 días)
     * @return Distancia DTW (0 = idénticas, mayor = más diferentes)
     */
    public double deformacionDinamica(double[] a, double[] b, int banda) {
        int n = a.length;  // Longitud de la serie A
        int m = b.length;  // Longitud de la serie B

        // Tabla de costos acumulados — (n+1)×(m+1) con fila/columna extra de bordes
        double[][] costo = new double[n + 1][m + 1];

        // Inicializa toda la tabla con infinito (caminos imposibles)
        for (double[] fila : costo) Arrays.fill(fila, Double.POSITIVE_INFINITY);

        // El punto de partida (sin datos procesados) tiene costo cero
        costo[0][0] = 0;

        // Llena la tabla de programación dinámica dentro de la banda Sakoe-Chiba
        for (int i = 1; i <= n; i++) {
            // Límites de la banda: solo procesa celdas cercanas a la diagonal
            int jInicio = Math.max(1, i - banda);  // No va más a la izquierda que la banda
            int jFin    = Math.min(m, i + banda);  // No va más a la derecha que la banda

            for (int j = jInicio; j <= jFin; j++) {
                // Costo local: distancia absoluta entre los precios a[i-1] y b[j-1]
                double d = Math.abs(a[i - 1] - b[j - 1]);

                // Costo acumulado mínimo: toma el mínimo de los tres vecinos posibles
                costo[i][j] = d + Math.min(costo[i - 1][j],          // Desde arriba (avanza A)
                                 Math.min(costo[i][j - 1],           // Desde izquierda (avanza B)
                                          costo[i - 1][j - 1]));    // Desde diagonal (avanza ambos)
            }
        }

        // La distancia final es el costo acumulado en la esquina inferior derecha
        return costo[n][m];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 5: MEDIA MÓVIL SIMPLE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula la Media Móvil Simple (SMA) de un array de valores.
     *
     * La SMA de ventana W en la posición i es el promedio de los últimos W valores.
     * Para las primeras (W-1) posiciones, no hay suficientes datos y se retorna null.
     *
     * Ejemplo con ventana=3: [10, 20, 30, 40, 50]
     *   → [null, null, 20.0, 30.0, 40.0]
     *
     * Se usa una suma deslizante (sliding sum) para eficiencia: en lugar de
     * recalcular el promedio desde cero cada vez, suma el nuevo elemento y
     * resta el que ya no está en la ventana. Complejidad O(n) en lugar de O(n×W).
     *
     * @param valores Array de precios o valores a suavizar
     * @param ventana Número de períodos de la media móvil (p.ej. 20 = SMA-20)
     * @return Array de misma longitud: null para primeras (ventana-1) posiciones,
     *         valor SMA para las demás
     */
    public Double[] mediaMovilSimple(double[] valores, int ventana) {
        Double[] resultado = new Double[valores.length];  // null por defecto en Java
        double suma = 0;

        for (int i = 0; i < valores.length; i++) {
            suma += valores[i];  // Agrega el nuevo elemento a la suma deslizante

            // Cuando la ventana se desborda, resta el elemento que sale de la ventana
            if (i >= ventana) suma -= valores[i - ventana];

            // Solo asigna el valor SMA cuando hay suficientes datos (desde posición ventana-1)
            resultado[i] = (i >= ventana - 1) ? suma / ventana : null;
        }
        return resultado;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 6: DETECCIÓN DE PATRONES TÉCNICOS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Cuenta las rachas alcistas consecutivas de exactamente k días.
     *
     * Una "racha alcista" de k días es una secuencia donde durante exactamente
     * k días consecutivos el precio de cierre fue mayor al del día anterior.
     * El contador se incrementa cuando la racha alcanza exactamente k días
     * (no más, no menos).
     *
     * @param serie     Serie de barras OHLCV en orden cronológico
     * @param kDias     Longitud exacta de la racha buscada (p.ej. 5 = cinco días)
     * @return Número de veces que ocurrió una racha alcista de exactamente k días
     */
    public int contarRachasAlcistas(List<BarraOhlcv> serie, int kDias) {
        int conteo = 0;   // Número de rachas encontradas
        int racha  = 0;   // Longitud de la racha actual

        for (int i = 1; i < serie.size(); i++) {
            if (serie.get(i).getCierre() > serie.get(i - 1).getCierre()) {
                // El cierre de hoy es mayor al de ayer: la racha continúa
                racha++;
                // Si la racha alcanzó exactamente k días, lo contamos
                if (racha == kDias) conteo++;
            } else {
                // La racha se interrumpió: reinicia el contador
                racha = 0;
            }
        }
        return conteo;
    }

    /**
     * Cuenta los patrones "V" en la serie histórica.
     *
     * Un patrón V representa una recuperación rápida: el precio cae bruscamente
     * y luego sube bruscamente en pocos días, formando una "V" en la gráfica.
     *
     * Definición formal: en una ventana de 3 días consecutivos (t-3, t-2, t-1, t):
     *   - Caída:  (precio[t-2] - precio[t-3]) / precio[t-3] < -umbral  (bajó más del umbral%)
     *   - Subida: (precio[t]   - precio[t-1]) / precio[t-1] >  umbral  (subió más del umbral%)
     *
     * @param serie   Serie de barras OHLCV en orden cronológico
     * @param umbral  Umbral relativo de caída/subida (default 0.02 = 2%)
     * @return Número de patrones V detectados en toda la serie
     */
    public int contarPatronesV(List<BarraOhlcv> serie, double umbral) {
        int conteo = 0;

        // Comienza en i=3 porque necesita mirar 3 días hacia atrás
        for (int i = 3; i < serie.size(); i++) {
            // Calcula el retorno del día de caída
            double caida = (serie.get(i - 2).getCierre() - serie.get(i - 3).getCierre())
                           / serie.get(i - 3).getCierre();

            // Calcula el retorno del día de recuperación
            double subida = (serie.get(i).getCierre() - serie.get(i - 1).getCierre())
                            / serie.get(i - 1).getCierre();

            // Verifica que la caída superó el umbral negativo Y la subida superó el umbral positivo
            if (caida < -umbral && subida > umbral) conteo++;
        }
        return conteo;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECCIÓN 7: CLASIFICACIÓN DE RIESGO
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Clasifica el perfil de riesgo de un activo según su volatilidad anualizada.
     *
     * Los umbrales son convenciones estándar de la industria financiera:
     *   - Conservador: volatilidad < 20% (p.ej. bonos del tesoro, ETFs de renta fija)
     *   - Moderado: entre 20% y 35%    (p.ej. acciones blue chip, ETFs amplios)
     *   - Agresivo: ≥ 35%              (p.ej. acciones individuales, criptomonedas)
     *
     * @param volatilidad Volatilidad anualizada del activo como decimal (p.ej. 0.25 = 25%)
     * @return Categoría de riesgo: "Conservador", "Moderado" o "Agresivo"
     */
    public String categoriaRiesgo(double volatilidad) {
        if (volatilidad < 0.20) return "Conservador";  // Baja volatilidad — riesgo bajo
        if (volatilidad < 0.35) return "Moderado";     // Volatilidad media — riesgo moderado
        return "Agresivo";                               // Alta volatilidad — riesgo alto
    }
}
