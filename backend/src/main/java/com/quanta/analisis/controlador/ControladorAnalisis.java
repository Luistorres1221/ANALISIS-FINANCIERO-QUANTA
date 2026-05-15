package com.quanta.analisis.controlador;

import com.quanta.analisis.dto.DtoMatrizCorrelacion;
import com.quanta.analisis.dto.DtoMetricasRiesgo;
import com.quanta.analisis.dto.DtoResultadoSimilitud;
import com.quanta.analisis.dto.RespuestaApi;
import com.quanta.analisis.servicio.ServicioEtl;
import com.quanta.analisis.servicio.ServicioRiesgo;
import com.quanta.analisis.servicio.ServicioSimilitud;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para los algoritmos de análisis financiero cuantitativo.
 *
 * Expone los siguientes endpoints:
 *   GET /api/v1/analysis/similarity            — Similitud entre dos activos
 *   GET /api/v1/analysis/correlation           — Matriz de correlación 20×20
 *   GET /api/v1/analysis/risk                  — Métricas de riesgo de todos los activos
 *   GET /api/v1/analysis/risk/{ticker}         — Métricas de riesgo de un activo
 *
 * @Validated activa la validación de parámetros en los métodos (@Min, @Max, @NotBlank)
 * Spring retorna automáticamente HTTP 400 si la validación falla.
 *
 * @RestController: controlador que responde JSON automáticamente
 * @RequestMapping: prefijo "/api/v1/analysis" para todas las rutas
 * @RequiredArgsConstructor: inyecta los tres servicios por constructor
 * @Tag: categoría en la documentación Swagger UI
 */
@Validated
@RestController
@RequestMapping("/api/v1/analysis")
@RequiredArgsConstructor
@Tag(name = "Análisis", description = "Similitud, correlación y métricas de riesgo")
public class ControladorAnalisis {

    /** Servicio que calcula los 4 algoritmos de similitud entre pares de activos */
    private final ServicioSimilitud servicioSimilitud;

    /** Servicio que calcula volatilidad, CAGR y categoría de riesgo por activo */
    private final ServicioRiesgo    servicioRiesgo;

    /** Servicio ETL que construye la matriz de correlación 20×20 */
    private final ServicioEtl       servicioEtl;

    // ═══════════════════════════════════════════════════════════════════════════
    // SIMILITUD ENTRE DOS ACTIVOS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula los 4 algoritmos de similitud (Pearson, Coseno, Euclidiana, DTW)
     * entre dos activos en una ventana de días configurable.
     *
     * Ejemplo: GET /api/v1/analysis/similarity?tickerA=ECOPETROL&tickerB=AAPL&days=252
     *
     * @param tickerA Ticker del primer activo (obligatorio, no vacío)
     * @param tickerB Ticker del segundo activo (obligatorio, no vacío)
     * @param days    Ventana en días de negociación (mínimo 10, máximo 1260)
     * @return HTTP 200 con DtoResultadoSimilitud que contiene las 4 métricas
     */
    @GetMapping("/similarity")
    @Operation(summary = "Similitud entre dos activos",
               description = "Calcula Pearson, Coseno, Euclidiana y DTW para la ventana de días indicada.")
    public ResponseEntity<RespuestaApi<DtoResultadoSimilitud>> calcularSimilitud(
            @RequestParam @NotBlank
            @Parameter(description = "Ticker del primer activo (ej: ECOPETROL)")
            String tickerA,

            @RequestParam @NotBlank
            @Parameter(description = "Ticker del segundo activo (ej: AAPL)")
            String tickerB,

            @RequestParam(defaultValue = "252") @Min(10) @Max(1260)
            @Parameter(description = "Ventana en días de negociación (default 252 = 1 año bursátil)")
            int days) {

        // Delega el cálculo al servicio de similitud y envuelve la respuesta
        return ResponseEntity.ok(RespuestaApi.exito(
                servicioSimilitud.comparar(tickerA, tickerB, days)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MATRIZ DE CORRELACIÓN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Construye y retorna la matriz de correlación de Pearson 20×20 entre todos los activos.
     *
     * La matriz es simétrica y tiene 1.0 en la diagonal. Se calcula sobre retornos
     * diarios completos (~900 observaciones por par). Este cálculo es O(n²/2).
     *
     * Ejemplo: GET /api/v1/analysis/correlation
     *
     * @return HTTP 200 con DtoMatrizCorrelacion (lista de tickers + matriz 20×20)
     */
    @GetMapping("/correlation")
    @Operation(summary = "Matriz de correlación 20×20",
               description = "Correlación de Pearson sobre retornos diarios de todos los activos. Matriz simétrica.")
    public ResponseEntity<RespuestaApi<DtoMatrizCorrelacion>> obtenerMatrizCorrelacion() {
        return ResponseEntity.ok(RespuestaApi.exito(servicioEtl.construirMatrizCorrelacion()));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MÉTRICAS DE RIESGO
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Retorna las métricas de riesgo de todos los activos del sistema.
     * Incluye: volatilidad anualizada, CAGR, categoría de riesgo, patrones técnicos.
     *
     * Ejemplo: GET /api/v1/analysis/risk
     *
     * @return HTTP 200 con lista de 20 DtoMetricasRiesgo (uno por activo)
     */
    @GetMapping("/risk")
    @Operation(summary = "Métricas de riesgo de todos los activos",
               description = "Volatilidad anualizada, CAGR, categoría de riesgo y patrones para cada activo.")
    public ResponseEntity<RespuestaApi<List<DtoMetricasRiesgo>>> obtenerRiesgoTodos() {
        return ResponseEntity.ok(RespuestaApi.exito(servicioRiesgo.obtenerTodasMetricasRiesgo()));
    }

    /**
     * Retorna las métricas de riesgo de un activo específico.
     *
     * Ejemplo: GET /api/v1/analysis/risk/NVDA
     *
     * @param ticker Símbolo bursátil del activo (en la URL)
     * @return HTTP 200 con DtoMetricasRiesgo del activo, o HTTP 404 si no existe
     */
    @GetMapping("/risk/{ticker}")
    @Operation(summary = "Métricas de riesgo de un activo específico",
               description = "Retorna todas las métricas de riesgo para el ticker indicado.")
    public ResponseEntity<RespuestaApi<DtoMetricasRiesgo>> obtenerRiesgoPorTicker(
            @PathVariable
            @Parameter(description = "Ticker del activo (ej: NVDA, TSLA)")
            String ticker) {
        return ResponseEntity.ok(RespuestaApi.exito(servicioRiesgo.obtenerMetricasRiesgo(ticker)));
    }
}
