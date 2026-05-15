package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO que reporta el estado actual del pipeline ETL (Extract, Transform, Load).
 *
 * ETL es el proceso que genera todas las series de datos OHLCV al arrancar
 * el servidor. Este DTO permite al cliente conocer cuántos activos están
 * disponibles, cuántas observaciones se procesaron y cuánto tardó la generación.
 *
 * El estado siempre es "READY" en condiciones normales; sería "PROCESSING" o
 * "ERROR" si se implementara generación asíncrona en el futuro.
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Patrón builder para construcción fluida
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class DtoEstadoEtl {

    /**
     * Estado actual del pipeline ETL.
     * Valores posibles: "READY" (datos disponibles), "PROCESSING" (generando), "ERROR"
     */
    private String status;

    /** Número de activos cargados exitosamente en memoria */
    private int assetsLoaded;

    /** Total de barras OHLCV generadas y almacenadas (suma de todas las series) */
    private int totalObservations;

    /** Fecha y hora de la última ejecución del ETL en formato ISO-8601 */
    private String lastRunAt;

    /** Tiempo que tardó la última generación de datos, en milisegundos */
    private long generationMs;

    /**
     * Mapa con la cantidad de barras por cada activo.
     * Clave: ticker del activo (p.ej. "ECOPETROL")
     * Valor: número de barras OHLCV generadas (p.ej. 901)
     */
    private Map<String, Integer> dataPointsPerAsset;

    /**
     * Mapa con la fuente de datos por activo.
     * Clave: ticker del activo (p.ej. "ECOPETROL")
     * Valor: "YAHOO_FINANCE" o "PRNG_FALLBACK"
     */
    private Map<String, String> fuentesDatos;

    /** Número de activos con datos reales de Yahoo Finance */
    private int activosYahooFinance;

    /** Número de activos usando datos sintéticos PRNG (fallback) */
    private int activosPrngFallback;
}
