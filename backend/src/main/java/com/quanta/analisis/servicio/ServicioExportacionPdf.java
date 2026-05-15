package com.quanta.analisis.servicio;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.quanta.analisis.dto.DtoActivo;
import com.quanta.analisis.dto.DtoEstadoEtl;
import com.quanta.analisis.dto.DtoMetricasRiesgo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

/**
 * Servicio de generación de reportes técnicos en formato PDF.
 *
 * Usa OpenPDF (fork de iText 5, licencia LGPL) para construir el documento.
 * El reporte consolida los resultados algorítmicos del análisis financiero:
 *   - Resumen del portafolio (20 activos con fuente de datos)
 *   - Estado del pipeline ETL (fuentes, observaciones, tiempo de carga)
 *   - Clasificación de riesgo (σ anualizada, CAGR, categoría)
 *   - Resumen de la metodología algorítmica por requerimiento
 *
 * El PDF se genera en memoria (ByteArrayOutputStream) para retornarlo
 * directamente como respuesta HTTP, sin necesidad de archivos temporales.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServicioExportacionPdf {

    private final ServicioActivos    servicioActivos;
    private final ServicioRiesgo     servicioRiesgo;
    private final ServicioEtl        servicioEtl;

    // ── Constantes de estilo ─────────────────────────────────────────────────────

    private static final Color COLOR_PRIMARIO   = new Color(99, 102, 241);  // indigo-500
    private static final Color COLOR_ACENTO     = new Color(16, 185, 129);  // emerald-500
    private static final Color COLOR_AGRESIVO   = new Color(239, 68,  68);  // red-500
    private static final Color COLOR_MODERADO   = new Color(245, 158, 11);  // amber-500
    private static final Color COLOR_CONSERV    = new Color(34,  197, 94);  // green-500
    private static final Color COLOR_FONDO_HEADER = new Color(30, 30, 50);
    private static final Color COLOR_FILA_PAR   = new Color(245, 245, 255);

    /**
     * Genera el reporte técnico PDF completo en memoria.
     *
     * Secciones del reporte:
     *   1. Portada (título, subtítulo, fecha)
     *   2. Resumen del portafolio (tabla con 20 activos, mercado, sector, fuente)
     *   3. Estado ETL (activos Yahoo Finance vs PRNG, observaciones, tiempo)
     *   4. Clasificación de riesgo (tabla ordenada por σ anualizada, descendente)
     *   5. Metodología algorítmica (descripción de los 4 algoritmos de similitud)
     *   6. Descripción de requerimientos funcionales implementados
     *
     * @return Array de bytes con el PDF generado
     */
    public byte[] generarReporte() {
        log.info("Generando reporte PDF...");
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Document documento = new Document(PageSize.A4, 40, 40, 60, 40);
        try {
            PdfWriter writer = PdfWriter.getInstance(documento, baos);
            writer.setPageEvent(new NumeradorPaginas());
            documento.open();

            agregarPortada(documento);
            agregarResumenPortafolio(documento);
            agregarEstadoEtl(documento);
            agregarTablaRiesgo(documento);
            agregarMetodologia(documento);

            documento.close();
        } catch (Exception e) {
            log.error("Error generando PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Error al generar el reporte PDF: " + e.getMessage(), e);
        }

        log.info("PDF generado: {} bytes", baos.size());
        return baos.toByteArray();
    }

    // ── Sección 1: Portada ────────────────────────────────────────────────────────

    private void agregarPortada(Document doc) throws DocumentException {
        Font fTitulo      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 36, COLOR_PRIMARIO);
        Font fSlogan      = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 11, new Color(120, 120, 160));
        Font fSubt        = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.DARK_GRAY);
        Font fSeccion     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.GRAY);
        Font fAutor       = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(40, 40, 80));
        Font fFecha       = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);
        Font fBadge       = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);

        doc.add(new Paragraph("\n\n\n"));

        // ── Logo / nombre de la plataforma ────────────────────────────────────────
        Paragraph titulo = new Paragraph("QUANTA LTDA", fTitulo);
        titulo.setAlignment(Element.ALIGN_CENTER);
        doc.add(titulo);

        Paragraph slogan = new Paragraph("Algorithmic Market Lab", fSlogan);
        slogan.setAlignment(Element.ALIGN_CENTER);
        slogan.setSpacingBefore(2);
        doc.add(slogan);

        doc.add(new Paragraph("\n"));
        agregarLinea(doc, COLOR_PRIMARIO);
        doc.add(new Paragraph("\n"));

        // ── Autores (justo debajo del título) ────────────────────────────────────
        Paragraph pSeccionAutores = new Paragraph("INTEGRANTES DEL PROYECTO", fSeccion);
        pSeccionAutores.setAlignment(Element.ALIGN_CENTER);
        doc.add(pSeccionAutores);
        doc.add(new Paragraph("\n"));

        String[] autores = {
            "Luis Alberto Torres",
            "Jhon Stivenson Méndez",
            "Robinson Gañan"
        };

        PdfPTable tablaAutores = new PdfPTable(1);
        tablaAutores.setWidthPercentage(60);
        tablaAutores.setHorizontalAlignment(Element.ALIGN_CENTER);
        tablaAutores.setSpacingBefore(4);

        for (String autor : autores) {
            PdfPCell celda = new PdfPCell(new Phrase(autor, fAutor));
            celda.setHorizontalAlignment(Element.ALIGN_CENTER);
            celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
            celda.setPadding(8);
            celda.setBorder(Rectangle.BOX);
            celda.setBorderColor(new Color(200, 200, 220));
            celda.setBackgroundColor(COLOR_FILA_PAR);
            tablaAutores.addCell(celda);
        }
        doc.add(tablaAutores);

        doc.add(new Paragraph("\n\n"));
        agregarLinea(doc, new Color(200, 200, 220));
        doc.add(new Paragraph("\n"));

        // ── Título del reporte ────────────────────────────────────────────────────
        Paragraph subtitulo = new Paragraph("Reporte de Análisis Algorítmico Financiero", fSubt);
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingBefore(4);
        doc.add(subtitulo);

        Paragraph descripcion = new Paragraph(
                "Pipeline ETL · Similitud entre Series · Riesgo y Volatilidad · Benchmarks de Ordenamiento", fFecha);
        descripcion.setAlignment(Element.ALIGN_CENTER);
        descripcion.setSpacingBefore(4);
        doc.add(descripcion);

        doc.add(new Paragraph("\n\n"));

        // ── KPIs del portafolio ───────────────────────────────────────────────────
        PdfPTable kpis = new PdfPTable(4);
        kpis.setWidthPercentage(90);
        kpis.setSpacingBefore(4);

        List<DtoActivo> activos = servicioActivos.obtenerTodosActivos();
        DtoEstadoEtl etl = servicioEtl.obtenerEstado();

        agregarKpi(kpis, "ACTIVOS", String.valueOf(activos.size()), "BVC + ETFs + NYSE");
        agregarKpi(kpis, "OBSERVACIONES", String.format("%,d", etl.getTotalObservations()), "barras OHLCV");
        agregarKpi(kpis, "YAHOO FINANCE", String.valueOf(etl.getActivosYahooFinance()), "activos con datos reales");
        agregarKpi(kpis, "HORIZONTE", "~5 años", "datos históricos diarios");
        doc.add(kpis);

        doc.add(new Paragraph("\n\n"));
        agregarLinea(doc, new Color(200, 200, 220));
        doc.add(new Paragraph("\n"));

        // ── Fecha de generación ───────────────────────────────────────────────────
        Paragraph fecha = new Paragraph(
                "Generado el " + LocalDateTime.now().format(
                        DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy 'a las' HH:mm",
                                java.util.Locale.forLanguageTag("es"))), fFecha);
        fecha.setAlignment(Element.ALIGN_CENTER);
        doc.add(fecha);

        doc.add(new Paragraph("\n"));

        // Badge de tecnologías
        Paragraph badge = new Paragraph(
                "  ● Yahoo Finance API  ● React 19 · Spring Boot 3  ● OpenPDF  ● JWT  ", fBadge);
        badge.setAlignment(Element.ALIGN_CENTER);
        doc.add(badge);

        doc.newPage();
    }

    private void agregarKpi(PdfPTable tabla, String label, String valor, String desc) {
        Font fLabel = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
        Font fValor = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, COLOR_PRIMARIO);
        Font fDesc  = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);

        PdfPCell celda = new PdfPCell();
        celda.setBorder(Rectangle.BOX);
        celda.setBorderColor(new Color(200, 200, 220));
        celda.setPadding(10);
        celda.setHorizontalAlignment(Element.ALIGN_CENTER);
        celda.addElement(new Phrase(label, fLabel));
        celda.addElement(new Phrase(valor, fValor));
        celda.addElement(new Phrase(desc, fDesc));
        tabla.addCell(celda);
    }

    // ── Sección 2: Resumen del portafolio ─────────────────────────────────────────

    private void agregarResumenPortafolio(Document doc) throws DocumentException {
        agregarTituloSeccion(doc, "1. Portafolio de Activos Analizados");

        Font fCuerpo = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
        doc.add(new Paragraph(
                "Portafolio compuesto por 20 instrumentos financieros: 10 acciones de la Bolsa de " +
                "Valores de Colombia (BVC), 4 ETFs internacionales y 6 acciones de mercados " +
                "estadounidenses (NYSE/NASDAQ). Los datos históricos cubren aproximadamente 5 años " +
                "de negociación diaria (OHLCV).", fCuerpo));
        doc.add(new Paragraph("\n"));

        PdfPTable tabla = new PdfPTable(new float[]{1.5f, 2.5f, 1.2f, 1.5f, 1.5f});
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(8);

        agregarEncabezadoTabla(tabla, "Ticker", "Nombre", "Mercado", "Sector", "Fuente");

        List<DtoActivo> activos = servicioActivos.obtenerTodosActivos();
        boolean par = false;
        for (DtoActivo a : activos) {
            Color fondo = par ? COLOR_FILA_PAR : Color.WHITE;
            Font  fDato = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
            Font  fFuente = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,
                    "YAHOO_FINANCE".equals(a.getDataSource()) ? COLOR_ACENTO : COLOR_MODERADO);

            agregarCeldaColoreada(tabla, a.getTicker(), fDato, fondo, true);
            agregarCeldaColoreada(tabla, a.getName(), fDato, fondo, false);
            agregarCeldaColoreada(tabla, a.getMarket(), fDato, fondo, false);
            agregarCeldaColoreada(tabla, a.getSector(), fDato, fondo, false);
            agregarCeldaColoreada(tabla, "YAHOO_FINANCE".equals(a.getDataSource())
                    ? "Yahoo Finance" : "PRNG Fallback", fFuente, fondo, false);
            par = !par;
        }
        doc.add(tabla);
        doc.newPage();
    }

    // ── Sección 3: Estado ETL ─────────────────────────────────────────────────────

    private void agregarEstadoEtl(Document doc) throws DocumentException {
        agregarTituloSeccion(doc, "2. Pipeline ETL — Extract, Transform, Load");

        Font fCuerpo = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
        doc.add(new Paragraph(
                "El pipeline ETL automatizado descarga datos históricos mediante peticiones HTTP " +
                "explícitas a la API pública de Yahoo Finance (v8/finance/chart), sin uso de " +
                "librerías de alto nivel. Ante fallos de red o símbolos no disponibles, el sistema " +
                "usa un generador PRNG determinista (mulberry32) como fallback.", fCuerpo));
        doc.add(new Paragraph("\n"));

        DtoEstadoEtl etl = servicioEtl.obtenerEstado();

        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(70);
        tabla.setSpacingBefore(8);
        tabla.setHorizontalAlignment(Element.ALIGN_LEFT);

        agregarFilaMetrica(tabla, "Estado del pipeline", etl.getStatus());
        agregarFilaMetrica(tabla, "Activos cargados", String.valueOf(etl.getAssetsLoaded()));
        agregarFilaMetrica(tabla, "Total observaciones OHLCV", String.format("%,d", etl.getTotalObservations()));
        agregarFilaMetrica(tabla, "Activos con Yahoo Finance", String.valueOf(etl.getActivosYahooFinance()));
        agregarFilaMetrica(tabla, "Activos con PRNG fallback", String.valueOf(etl.getActivosPrngFallback()));
        agregarFilaMetrica(tabla, "Tiempo de carga", etl.getGenerationMs() + " ms");
        agregarFilaMetrica(tabla, "Última ejecución", etl.getLastRunAt() != null
                ? etl.getLastRunAt().substring(0, Math.min(19, etl.getLastRunAt().length())) : "N/A");
        doc.add(tabla);

        doc.add(new Paragraph("\n"));
        Font fSub = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
        doc.add(new Paragraph("Pasos del pipeline:", fSub));
        doc.add(new Paragraph("\n"));

        String[][] pasos = {
            {"Extract", "GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5y",
             "Petición HTTP explícita con java.net.http.HttpClient. Reintentos con backoff lineal (3 intentos, timeout 20s)."},
            {"Transform", "ServicioLimpiezaDatos.limpiar(ticker, serie)",
             "Detección de gaps, interpolación lineal para días faltantes, detección y corrección de anomalías OHLCV."},
            {"Load", "ConcurrentHashMap<String, List<BarraOhlcv>>",
             "Serie limpia almacenada en memoria. ConcurrentHashMap permite acceso concurrente seguro sin bloqueos."},
            {"Fallback", "GeneradorDatos.generarSerie(semilla, precio0, días, drift, vol)",
             "PRNG mulberry32 determinista si Yahoo Finance falla. Misma semilla → misma serie (reproducibilidad)."}
        };

        for (String[] p : pasos) {
            Font fNombre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, COLOR_PRIMARIO);
            Font fCodigo = FontFactory.getFont(FontFactory.COURIER, 7, new Color(80, 80, 80));
            Font fDesc2  = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.DARK_GRAY);
            doc.add(new Paragraph("▶ " + p[0], fNombre));
            doc.add(new Paragraph("  " + p[1], fCodigo));
            doc.add(new Paragraph("  " + p[2], fDesc2));
            doc.add(new Paragraph("\n"));
        }
        doc.newPage();
    }

    // ── Sección 4: Clasificación de riesgo ───────────────────────────────────────

    private void agregarTablaRiesgo(Document doc) throws DocumentException {
        agregarTituloSeccion(doc, "3. Clasificación de Riesgo — Volatilidad y Rendimiento");

        Font fCuerpo = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
        doc.add(new Paragraph(
                "Activos clasificados por volatilidad anualizada (σ × √252). " +
                "Categorías: Conservador (σ < 20%), Moderado (20% ≤ σ < 35%), Agresivo (σ ≥ 35%). " +
                "CAGR = tasa de crecimiento anual compuesta desde la primera barra.", fCuerpo));
        doc.add(new Paragraph("\n"));

        PdfPTable tabla = new PdfPTable(new float[]{1.2f, 2f, 1f, 1.2f, 1.3f, 1.5f});
        tabla.setWidthPercentage(100);
        tabla.setSpacingBefore(8);

        agregarEncabezadoTabla(tabla, "Ticker", "Nombre", "Mercado", "σ anual", "CAGR", "Categoría");

        List<DtoMetricasRiesgo> metricas = servicioRiesgo.obtenerTodasMetricasRiesgo();
        metricas.sort(Comparator.comparingDouble(DtoMetricasRiesgo::getAnnualizedVolatility).reversed());

        boolean par = false;
        for (DtoMetricasRiesgo m : metricas) {
            Color fondo = par ? COLOR_FILA_PAR : Color.WHITE;
            Font  fDato = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
            Color colorCateg = switch (m.getRiskCategory()) {
                case "Agresivo"    -> COLOR_AGRESIVO;
                case "Moderado"    -> COLOR_MODERADO;
                default            -> COLOR_CONSERV;
            };
            Font fCateg = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, colorCateg);

            agregarCeldaColoreada(tabla, m.getTicker(), fDato, fondo, true);
            agregarCeldaColoreada(tabla, m.getName(), fDato, fondo, false);
            agregarCeldaColoreada(tabla, m.getMarket(), fDato, fondo, false);
            agregarCeldaColoreada(tabla, String.format("%.1f%%", m.getAnnualizedVolatility() * 100), fDato, fondo, false);
            agregarCeldaColoreada(tabla, String.format("%.1f%%", m.getCagr() * 100), fDato, fondo, false);
            agregarCeldaColoreada(tabla, m.getRiskCategory(), fCateg, fondo, false);
            par = !par;
        }
        doc.add(tabla);
        doc.newPage();
    }

    // ── Sección 5: Metodología algorítmica ───────────────────────────────────────

    private void agregarMetodologia(Document doc) throws DocumentException {
        agregarTituloSeccion(doc, "4. Metodología Algorítmica");

        Font fSub    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, COLOR_PRIMARIO);
        Font fCuerpo = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
        Font fCodigo = FontFactory.getFont(FontFactory.COURIER, 8, new Color(60, 60, 80));

        Object[][] algoritmos = {
            {"REQ 2 — Correlación de Pearson  [O(n)]",
             "ρ = Σ[(xᵢ-x̄)(yᵢ-ȳ)] / √[Σ(xᵢ-x̄)² × Σ(yᵢ-ȳ)²]",
             "Mide la relación lineal entre los retornos diarios de dos activos. Rango [-1, 1]. " +
             "Aplicado sobre retornos (no precios) para eliminar tendencias y garantizar estacionariedad."},
            {"REQ 2 — Similitud por Coseno  [O(n)]",
             "sim = A·B / (‖A‖ × ‖B‖)",
             "Compara la dirección de los vectores de precios de cierre. Rango [0, 1] para precios " +
             "positivos. Insensible a la magnitud absoluta; dos activos con el mismo perfil de " +
             "movimiento pero a precios muy distintos tendrán similitud alta."},
            {"REQ 2 — Distancia Euclidiana normalizada  [O(n)]",
             "d = √[Σ(z(aᵢ) - z(bᵢ))²]    donde z(x) = (x-μ)/σ",
             "Z-score normaliza cada serie antes de calcular la distancia. Esto hace la métrica " +
             "invariante a la escala de precios (en pesos COP vs USD). Valor cercano a 0 indica " +
             "series con la misma forma, independientemente del precio absoluto."},
            {"REQ 2 — Dynamic Time Warping (DTW)  [O(n×w)]",
             "D[i][j] = |a[i]-b[j]| + min(D[i-1][j], D[i][j-1], D[i-1][j-1])",
             "Programación dinámica que permite comparar series que pueden diferir en velocidad " +
             "o fase. La banda Sakoe-Chiba (w=20 días) reduce la complejidad de O(n²) a O(n×w). " +
             "Ventaja sobre Euclidiana: detecta el mismo patrón aunque ocurra con desfase temporal."},
            {"REQ 3 — Ventana deslizante y patrones  [O(n)]",
             "for i in range(k, n): if close[i] > close[i-1]: streak++",
             "Detecta rachas alcistas (k días consecutivos al alza) y patrones V (caída ≥2% seguida " +
             "de subida ≥2% en ventana de 4 barras). Complejidad O(n) por recorrido único de la serie."},
            {"REQ 3 — Volatilidad anualizada  [O(n)]",
             "σ_anual = σ_diaria × √252",
             "Desviación estándar de los retornos logarítmicos diarios, anualizada multiplicando " +
             "por √252 (días hábiles por año). Corrección de Bessel (n-1) para estimación insesgada."},
        };

        for (Object[] alg : algoritmos) {
            doc.add(new Paragraph((String) alg[0], fSub));
            doc.add(new Paragraph("  Fórmula: " + alg[1], fCodigo));
            doc.add(new Paragraph("  " + alg[2], fCuerpo));
            doc.add(new Paragraph("\n"));
        }
    }

    // ── Utilidades de construcción PDF ────────────────────────────────────────────

    private void agregarTituloSeccion(Document doc, String texto) throws DocumentException {
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, COLOR_PRIMARIO);
        Paragraph p = new Paragraph(texto, f);
        p.setSpacingBefore(4);
        p.setSpacingAfter(4);
        doc.add(p);
        agregarLinea(doc, COLOR_PRIMARIO);
        doc.add(new Paragraph("\n"));
    }

    private void agregarLinea(Document doc, Color color) throws DocumentException {
        PdfPTable linea = new PdfPTable(1);
        linea.setWidthPercentage(100);
        PdfPCell celda = new PdfPCell(new Phrase(" "));
        celda.setBorder(Rectangle.BOTTOM);
        celda.setBorderColorBottom(color);
        celda.setBorderWidthBottom(1.5f);
        celda.setPadding(0);
        linea.addCell(celda);
        doc.add(linea);
    }

    private void agregarEncabezadoTabla(PdfPTable tabla, String... columnas) {
        Font f = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
        for (String col : columnas) {
            PdfPCell celda = new PdfPCell(new Phrase(col, f));
            celda.setBackgroundColor(COLOR_FONDO_HEADER);
            celda.setPadding(5);
            celda.setHorizontalAlignment(Element.ALIGN_CENTER);
            tabla.addCell(celda);
        }
    }

    private void agregarCeldaColoreada(PdfPTable tabla, String texto, Font font,
                                        Color fondo, boolean negrita) {
        PdfPCell celda = new PdfPCell(new Phrase(texto, font));
        celda.setBackgroundColor(fondo);
        celda.setPadding(4);
        celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
        tabla.addCell(celda);
    }

    private void agregarFilaMetrica(PdfPTable tabla, String nombre, String valor) {
        Font fNombre = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
        Font fValor  = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
        PdfPCell cNombre = new PdfPCell(new Phrase(nombre, fNombre));
        cNombre.setPadding(5);
        cNombre.setBackgroundColor(COLOR_FILA_PAR);
        tabla.addCell(cNombre);
        PdfPCell cValor = new PdfPCell(new Phrase(valor, fValor));
        cValor.setPadding(5);
        tabla.addCell(cValor);
    }

    // ── Numerador de páginas ──────────────────────────────────────────────────────

    private static class NumeradorPaginas extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            Font f = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
            Phrase pie = new Phrase("Quanta · Reporte de Análisis Financiero · Pág. " +
                    writer.getPageNumber(), f);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, pie,
                    document.right(), document.bottom() - 15, 0);
        }
    }
}
