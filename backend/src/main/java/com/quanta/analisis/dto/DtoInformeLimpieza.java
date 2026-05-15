package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que reporta las operaciones de limpieza ejecutadas sobre una serie OHLCV.
 *
 * Generado por ServicioLimpiezaDatos al procesar cada activo en el pipeline ETL.
 * Permite auditar qué transformaciones se aplicaron y con qué metodología.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DtoInformeLimpieza {

    /** Ticker del activo procesado */
    private String ticker;

    /** Número de barras OHLCV en la serie antes de la limpieza */
    private int barrasOriginales;

    /** Número de barras OHLCV en la serie después de la limpieza */
    private int barrasFinales;

    /** Número de días hábiles faltantes detectados en la serie (gaps) */
    private int gapsDetectados;

    /** Número de barras añadidas por interpolación lineal para cubrir gaps */
    private int gapsInterpolados;

    /** Número de barras con incoherencias OHLCV detectadas (High < Low, precios ≤ 0, etc.) */
    private int anomaliasDetectadas;

    /** Número de anomalías OHLCV corregidas automáticamente */
    private int anomaliasCorregidas;

    /**
     * Descripción de la metodología usada para manejar valores faltantes.
     * Ejemplo: "Interpolación lineal entre barras adyacentes"
     */
    private String metodologiaGaps;

    /**
     * Descripción de la metodología usada para corregir anomalías OHLCV.
     * Ejemplo: "Corrección garantizando H ≥ max(O,C) y L ≤ min(O,C)"
     */
    private String metodologiaAnomalias;
}
