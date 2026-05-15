package com.quanta.analisis.controlador;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quanta.analisis.dto.DtoEstadoEtl;
import com.quanta.analisis.dto.DtoEventoEtl;
import com.quanta.analisis.dto.RespuestaApi;
import com.quanta.analisis.servicio.ServicioActivos;
import com.quanta.analisis.servicio.ServicioEtl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Controlador REST para la gestión y monitoreo del pipeline ETL.
 *
 * Endpoints:
 *   GET  /api/v1/etl/status   — Estado actual del pipeline
 *   POST /api/v1/etl/refresh  — Re-ejecuta el pipeline completo (síncrono)
 *   GET  /api/v1/etl/stream   — Stream SSE con progreso activo por activo (tiempo real)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/etl")
@RequiredArgsConstructor
@Tag(name = "ETL", description = "Estado y gestión del pipeline de datos")
public class ControladorEtl {

    private final ServicioEtl     servicioEtl;
    private final ServicioActivos servicioActivos;
    private final ObjectMapper    objectMapper;

    @GetMapping("/status")
    @Operation(summary = "Estado del pipeline ETL")
    public ResponseEntity<RespuestaApi<DtoEstadoEtl>> consultarEstado() {
        return ResponseEntity.ok(RespuestaApi.exito(servicioEtl.obtenerEstado()));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Re-generar todos los datos (síncrono)")
    public ResponseEntity<RespuestaApi<DtoEstadoEtl>> actualizarDatos() {
        return ResponseEntity.ok(RespuestaApi.exito(servicioEtl.actualizarDatos()));
    }

    /**
     * Endpoint SSE que re-ejecuta el pipeline ETL emitiendo un evento por cada activo cargado.
     *
     * El cliente se conecta con EventSource y recibe eventos con nombre:
     *   "inicio"   — pipeline arrancado, total = 20
     *   "activo"   — activo listo (ticker, fuente, barras, últimos 60 cierres para sparkline)
     *   "completo" — todos los activos listos, estadísticas globales
     *
     * El stream se cierra automáticamente al completarse.
     * Timeout de la conexión: 10 minutos.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream SSE de progreso ETL en tiempo real")
    public SseEmitter streamearEtl() {
        SseEmitter emitter = new SseEmitter(600_000L);

        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> log.warn("SSE client disconnected: {}", e.getMessage()));

        new Thread(() -> {
            try {
                // Evento de inicio
                emitter.send(SseEmitter.event()
                        .name("inicio")
                        .data(objectMapper.writeValueAsString(
                                DtoEventoEtl.builder()
                                        .tipo("inicio")
                                        .mensaje("Iniciando pipeline ETL — 20 activos")
                                        .total(20)
                                        .progreso(0)
                                        .build()
                        )));

                // ETL con callback por activo
                servicioActivos.reinicializarConCallback(evento -> {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("activo")
                                .data(objectMapper.writeValueAsString(evento)));
                    } catch (Exception e) {
                        throw new RuntimeException("Error enviando evento SSE: " + e.getMessage(), e);
                    }
                });

                // Evento de finalización
                var fuentes   = servicioActivos.getFuenteDatos();
                long yahoo    = fuentes.values().stream().filter("YAHOO_FINANCE"::equals).count();

                emitter.send(SseEmitter.event()
                        .name("completo")
                        .data(objectMapper.writeValueAsString(
                                DtoEventoEtl.builder()
                                        .tipo("completo")
                                        .total(20)
                                        .progreso(20)
                                        .totalBarras((long) servicioActivos.totalObservaciones())
                                        .duracionMs(servicioActivos.getTiempoGeneracionMs())
                                        .activosYahoo((int) yahoo)
                                        .activosPrng((int) (fuentes.size() - yahoo))
                                        .mensaje("Pipeline ETL completado exitosamente")
                                        .build()
                        )));

                emitter.complete();
                log.info("SSE ETL stream completado correctamente");

            } catch (Exception e) {
                log.error("Error en SSE ETL stream: {}", e.getMessage());
                try {
                    emitter.send(SseEmitter.event()
                            .name("etl_error")
                            .data("{\"tipo\":\"error\",\"mensaje\":\"" + e.getMessage() + "\"}"));
                } catch (Exception ignored) {}
                emitter.completeWithError(e);
            }
        }, "etl-sse-thread").start();

        return emitter;
    }
}
