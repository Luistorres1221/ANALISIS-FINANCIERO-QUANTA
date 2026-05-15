package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que contiene los resultados de los cuatro algoritmos de similitud
 * calculados entre dos activos financieros.
 *
 * Se usa para comparar el comportamiento temporal de dos activos en una
 * ventana de días configurable. Los cuatro métricas capturan distintos
 * aspectos de la similitud:
 *   - Pearson: correlación lineal de retornos
 *   - Coseno:  similitud de dirección en espacio vectorial de precios
 *   - Euclidiana: distancia de forma (normalizada por z-score)
 *   - DTW: similitud con deformación temporal (Dynamic Time Warping)
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Patrón builder para construcción fluida
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class DtoResultadoSimilitud {

    /** Ticker del primer activo (p.ej. "ECOPETROL") */
    private String tickerA;

    /** Ticker del segundo activo (p.ej. "AAPL") */
    private String tickerB;

    /** Nombre completo del primer activo */
    private String nameA;

    /** Nombre completo del segundo activo */
    private String nameB;

    /**
     * Correlación de Pearson sobre los retornos diarios.
     * Rango: [-1, 1]. Valores cercanos a 1 indican alta correlación positiva.
     */
    private double pearson;

    /**
     * Similitud coseno entre los vectores de precios de cierre.
     * Rango: [0, 1]. Mide si los precios apuntan en la misma dirección.
     */
    private double cosine;

    /**
     * Distancia euclidiana entre precios normalizados (z-score).
     * Rango: [0, ∞). Valores menores indican mayor similitud de forma.
     */
    private double euclidean;

    /**
     * Distancia DTW (Dynamic Time Warping) con banda Sakoe-Chiba de 20 días.
     * Mide similitud permitiendo desfases temporales entre las series.
     * Rango: [0, ∞). Valores menores indican mayor similitud.
     */
    private double dtw;

    /** Número efectivo de días utilizados en la comparación (mínimo entre las dos series) */
    private int windowDays;
}
