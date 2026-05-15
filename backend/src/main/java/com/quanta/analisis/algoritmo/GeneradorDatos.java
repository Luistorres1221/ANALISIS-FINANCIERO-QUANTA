package com.quanta.analisis.algoritmo;

import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Genera series de precios OHLCV deterministas usando el PRNG mulberry32.
 *
 * PRNG (Pseudo Random Number Generator): generador de números pseudoaleatorios.
 * "Determinista" significa que la misma semilla siempre produce la misma serie,
 * garantizando que frontend y backend muestren exactamente los mismos datos.
 *
 * Este generador es un puerto exacto del algoritmo TypeScript del frontend,
 * preservando la aritmética de enteros de 32 bits para reproducibilidad total.
 *
 * @Component registra esta clase como componente Spring para inyección de dependencias.
 */
@Component
public class GeneradorDatos {

    /**
     * Implementación del algoritmo PRNG mulberry32.
     *
     * mulberry32 es un generador de números pseudoaleatorios de alta calidad
     * basado en operaciones de bits sobre enteros de 32 bits. Es extremadamente
     * rápido y produce distribuciones uniformes de buena calidad estadística.
     *
     * Clase estática anidada: no necesita una instancia de GeneradorDatos para usarse.
     * La palabra clave "final" impide que otras clases la extiendan.
     */
    public static final class Mulberry32 {

        /** Estado interno del generador — cambia con cada llamada a siguiente() */
        private int estado;

        /**
         * Inicializa el generador con una semilla específica.
         * La misma semilla siempre producirá la misma secuencia de números.
         *
         * @param semilla Valor inicial del estado interno (único por activo)
         */
        public Mulberry32(int semilla) {
            this.estado = semilla;
        }

        /**
         * Genera el siguiente número pseudoaleatorio en el rango [0.0, 1.0).
         *
         * Implementa la secuencia mulberry32 con aritmética de 32 bits:
         * - El desbordamiento natural de int en Java es equivalente a "| 0" en JavaScript
         * - La conversión a long con máscara 0xFFFFFFFFL simula ">>> 0" de JavaScript
         *   (convierte int con signo a uint32 antes de dividir)
         *
         * @return Número double en [0.0, 1.0) — distribuido uniformemente
         */
        public double siguiente() {
            // Avanza el estado sumando la constante mágica de mulberry32
            estado += 0x6D2B79F5;
            int t = estado;
            // Primera mezcla de bits: XOR con desplazamiento de 15 bits, multiplicación
            t = (t ^ (t >>> 15)) * (t | 1);
            // Segunda mezcla: XOR compuesto con desplazamiento de 7 bits
            t ^= t + (t ^ (t >>> 7)) * (t | 61);
            // Convierte int (con signo) a uint32 con máscara, luego divide para obtener [0,1)
            // Equivale a: (t ^ (t >>> 14)) >>> 0 en JavaScript
            return ((long) (t ^ (t >>> 14)) & 0xFFFFFFFFL) / 4294967296.0;
        }
    }

    /**
     * Genera una serie completa de barras OHLCV usando el modelo de precios estocástico.
     *
     * El modelo simula precios bursátiles reales:
     *   precio_nuevo = precio_anterior × (1 + drift + aleatorio × volatilidad)
     *
     * Donde:
     *   - drift: tendencia diaria media (positivo = alcista, negativo = bajista)
     *   - aleatorio: número en [-1, 1] del PRNG
     *   - volatilidad: amplitud de las oscilaciones aleatorias diarias
     *
     * Los fines de semana se omiten (los mercados bursátiles no operan sábados ni domingos).
     *
     * @param semilla      Semilla única del PRNG por activo — garantiza reproducibilidad
     * @param precioInicial Precio de apertura del primer día de la serie
     * @param dias         Ventana de días hacia atrás desde hoy (p.ej. 1260 = ~5 años)
     * @param drift        Tendencia diaria media (p.ej. 0.0003 = +0.03%/día)
     * @param volatilidad  Amplitud de variación aleatoria diaria (p.ej. 0.018 = 1.8%/día)
     * @return Lista de BarraOhlcv en orden cronológico (del más antiguo al más reciente)
     */
    public List<BarraOhlcv> generarSerie(int semilla, double precioInicial,
                                          int dias, double drift, double volatilidad) {
        // Inicializa el generador con la semilla del activo
        Mulberry32 aleatorio = new Mulberry32(semilla);

        // Reserva memoria para las barras esperadas (evita reallocations)
        List<BarraOhlcv> barras = new ArrayList<>(dias);

        // Precio actual — se actualiza barra a barra simulando el movimiento del mercado
        double precio = precioInicial;

        // Fecha de hoy — punto de referencia para calcular la ventana histórica
        LocalDate hoy = LocalDate.now();

        // Itera desde 'dias' atrás hasta hoy (de más antiguo a más reciente)
        for (int i = dias; i >= 0; i--) {
            LocalDate fecha = hoy.minusDays(i);

            // Omite sábados y domingos — los mercados no operan en fines de semana
            if (fecha.getDayOfWeek() == DayOfWeek.SATURDAY ||
                fecha.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }

            // Genera un número aleatorio en [-1, 1] para el retorno diario
            double r = (aleatorio.siguiente() - 0.5) * 2;

            // Calcula el cambio porcentual del día: drift + componente aleatoria
            double cambio = drift + r * volatilidad;

            // Precio de apertura = precio de cierre del día anterior
            double apertura = precio;

            // Precio de cierre: aplica el cambio. Mínimo 0.5 para evitar precios negativos
            double cierre = Math.max(0.5, precio * (1 + cambio));

            // Precio máximo: ligeramente por encima del máximo entre apertura y cierre
            double maximo = Math.max(apertura, cierre) * (1 + aleatorio.siguiente() * volatilidad * 0.5);

            // Precio mínimo: ligeramente por debajo del mínimo entre apertura y cierre
            double minimo = Math.min(apertura, cierre) * (1 - aleatorio.siguiente() * volatilidad * 0.5);

            // Volumen: entre 500,000 y 5,500,000 unidades (distribución uniforme)
            long volumen = (long) (500_000 + aleatorio.siguiente() * 5_000_000);

            // Construye la barra OHLCV con los valores calculados (redondeados a 2 decimales)
            barras.add(BarraOhlcv.builder()
                    .fecha(fecha.toString())          // Formato "YYYY-MM-DD"
                    .apertura(redondear2(apertura))   // Open redondeado
                    .maximo(redondear2(maximo))       // High redondeado
                    .minimo(redondear2(minimo))       // Low redondeado
                    .cierre(redondear2(cierre))       // Close redondeado
                    .volumen(volumen)
                    .build());

            // El precio de cierre de hoy se convierte en la apertura de mañana
            precio = cierre;
        }

        return barras;
    }

    /**
     * Redondea un valor a exactamente 2 decimales.
     * Se usa para precios con centavos (p.ej. 32,150.75 COP o 165.23 USD).
     *
     * @param valor Número a redondear
     * @return Valor redondeado a 2 decimales (p.ej. 32150.75)
     */
    private static double redondear2(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }
}
