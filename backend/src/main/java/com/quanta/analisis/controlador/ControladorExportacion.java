package com.quanta.analisis.controlador;

import com.quanta.analisis.servicio.ServicioExportacionPdf;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST para la exportación del reporte técnico en PDF.
 *
 * Expone el endpoint GET /api/v1/export/report que genera y descarga
 * un reporte PDF consolidado con todos los análisis del dashboard.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
@Tag(name = "Exportación", description = "Generación de reportes técnicos en PDF")
public class ControladorExportacion {

    private final ServicioExportacionPdf servicioPdf;

    /**
     * Genera y descarga el reporte técnico completo en formato PDF.
     *
     * El PDF incluye:
     *   - Portada con métricas del portafolio
     *   - Tabla de los 20 activos con fuente de datos (Yahoo Finance / PRNG)
     *   - Estado del pipeline ETL
     *   - Clasificación de riesgo ordenada por σ anualizada
     *   - Descripción de la metodología algorítmica (4 algoritmos de similitud, DTW, etc.)
     *
     * La cabecera Content-Disposition: attachment indica al navegador que debe
     * descargar el archivo en lugar de mostrarlo en línea.
     *
     * @return ResponseEntity con el PDF como array de bytes y cabeceras de descarga
     */
    @GetMapping(value = "/report", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Generar reporte PDF",
               description = "Genera y descarga el reporte técnico completo del análisis financiero en formato PDF")
    public ResponseEntity<byte[]> generarReporte() {
        log.info("Solicitud de reporte PDF recibida");
        byte[] pdf = servicioPdf.generarReporte();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"quanta-reporte-financiero.pdf\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .body(pdf);
    }
}
