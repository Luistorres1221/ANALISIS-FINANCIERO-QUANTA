package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO que representa un evento del pipeline ETL emitido via Server-Sent Events (SSE).
 *
 * Se usa en el endpoint GET /api/v1/etl/stream para notificar al cliente
 * el progreso activo por activo durante la re-ejecución del pipeline.
 *
 * Tipos de evento (campo "tipo"):
 *   "inicio"   — el pipeline arrancó, incluye total de activos
 *   "activo"   — un activo terminó de cargarse, incluye datos completos + sparkline
 *   "completo" — todos los activos están listos, incluye estadísticas globales
 *   "error"    — ocurrió un error durante la carga
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DtoEventoEtl {

    /** Tipo de evento: "inicio" | "activo" | "completo" | "error" */
    private String tipo;

    // ── Campos comunes a "activo" ────────────────────────────────────────────────

    /** Ticker del activo (ej. "AAPL", "ECOPETROL") */
    private String ticker;

    /** Nombre completo de la empresa o fondo */
    private String nombre;

    /** Mercado donde cotiza: "BVC", "NYSE", "NASDAQ" o "AMEX" */
    private String mercado;

    /** Sector económico del activo */
    private String sector;

    /** Fuente de datos: "YAHOO_FINANCE" | "PRNG_FALLBACK" */
    private String fuente;

    /** Número de barras OHLCV cargadas para este activo */
    private int barras;

    /** Último precio de cierre disponible en la serie */
    private double ultimoCierre;

    /** Últimos 60 precios de cierre para el sparkline del frontend */
    private List<Double> precios;

    /** Posición del activo en la secuencia (1-indexado, ej. 1 = primer activo listo) */
    private int progreso;

    /** Total de activos en el pipeline (siempre 20) */
    private int total;

    // ── Campos para el evento "completo" ────────────────────────────────────────

    /** Suma total de barras OHLCV de todos los activos */
    private Long totalBarras;

    /** Duración total del pipeline en milisegundos */
    private Long duracionMs;

    /** Número de activos cargados desde Yahoo Finance */
    private Integer activosYahoo;

    /** Número de activos que usaron fallback PRNG */
    private Integer activosPrng;

    /** Mensaje descriptivo del evento */
    private String mensaje;
}
