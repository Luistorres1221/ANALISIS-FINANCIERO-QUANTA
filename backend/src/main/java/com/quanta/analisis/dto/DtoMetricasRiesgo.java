package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que contiene las métricas de riesgo y rendimiento calculadas
 * para un activo financiero individual.
 *
 * Agrupa: volatilidad anualizada, CAGR, categoría de riesgo,
 * frecuencia de patrones técnicos y datos básicos de identificación.
 * Se usa para poblar la tabla de riesgo en el dashboard del frontend.
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Patrón builder para construcción fluida
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class DtoMetricasRiesgo {

    /** Símbolo bursátil del activo */
    private String ticker;

    /** Nombre completo del activo */
    private String name;

    /** Mercado donde cotiza */
    private String market;

    /** Sector económico */
    private String sector;

    /**
     * Volatilidad histórica anualizada: desviación estándar de retornos × √252.
     * Representa el riesgo total del activo en términos de variabilidad de precios.
     * Ejemplo: 0.25 = 25% de volatilidad anualizada.
     */
    private double annualizedVolatility;

    /**
     * CAGR (Compound Annual Growth Rate): tasa de crecimiento anual compuesta.
     * Mide el rendimiento anualizado total desde el inicio de la serie.
     * Ejemplo: 0.12 = 12% de crecimiento anual compuesto.
     */
    private double cagr;

    /**
     * Categoría de riesgo basada en la volatilidad anualizada:
     *   - "Conservador"  → vol < 20%
     *   - "Moderado"     → vol entre 20% y 35%
     *   - "Agresivo"     → vol ≥ 35%
     */
    private String riskCategory;

    /**
     * Número de rachas alcistas de exactamente 5 días consecutivos detectadas.
     * Una racha alcista ocurre cuando el cierre de cada día es mayor al del día anterior.
     */
    private int upStreaks5;

    /**
     * Número de patrones "V" detectados en la serie histórica.
     * Un patrón V se define como: caída mayor al 2% seguida de subida mayor al 2%
     * en una ventana de 3 días consecutivos.
     */
    private int vShapes;

    /** Último precio de cierre disponible en la serie */
    private double lastClose;

    /** Total de barras OHLCV disponibles (~5 años de datos diarios = ~901 barras) */
    private int dataPoints;
}
