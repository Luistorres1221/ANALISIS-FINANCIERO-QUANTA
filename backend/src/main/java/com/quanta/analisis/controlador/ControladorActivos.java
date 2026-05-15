package com.quanta.analisis.controlador;

import com.quanta.analisis.algoritmo.AlgoritmosFinancieros;
import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import com.quanta.analisis.dto.DtoActivo;
import com.quanta.analisis.dto.DtoBarraOhlcv;
import com.quanta.analisis.dto.RespuestaApi;
import com.quanta.analisis.servicio.ServicioActivos;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controlador REST para consulta de activos financieros y sus series de precios.
 *
 * Expone los siguientes endpoints:
 *   GET /api/v1/assets              — Lista todos los activos con su último precio
 *   GET /api/v1/assets/{ticker}     — Detalle de un activo específico
 *   GET /api/v1/assets/{ticker}/ohlcv — Serie OHLCV completa o parcial
 *   GET /api/v1/assets/{ticker}/sma  — Media Móvil Simple calculada
 *
 * @RestController: combina @Controller + @ResponseBody (responde JSON automáticamente)
 * @RequestMapping: prefijo base de todas las rutas de este controlador
 * @RequiredArgsConstructor: inyecta ServicioActivos y AlgoritmosFinancieros por constructor
 * @Tag: etiqueta para la documentación Swagger UI
 */
@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
@Tag(name = "Activos", description = "Consulta de activos financieros y series OHLCV")
public class ControladorActivos {

    /** Servicio que gestiona los activos y sus series históricas */
    private final ServicioActivos        servicioActivos;

    /** Algoritmos financieros — usados para calcular la SMA */
    private final AlgoritmosFinancieros  algoritmos;

    /**
     * Retorna la lista completa de los 20 activos disponibles.
     * Incluye ticker, nombre, mercado, sector, último cierre y cantidad de barras.
     *
     * Ejemplo de llamada: GET http://localhost:8080/api/v1/assets
     *
     * @return HTTP 200 con la lista de 20 DtoActivo envuelta en RespuestaApi
     */
    @GetMapping
    @Operation(summary = "Listar todos los activos",
               description = "Retorna los 20 activos (BVC, ETFs, NYSE, NASDAQ) con su último precio y cantidad de barras")
    public ResponseEntity<RespuestaApi<List<DtoActivo>>> listarActivos() {
        // Obtiene todos los activos y los envuelve en la respuesta estándar
        return ResponseEntity.ok(RespuestaApi.exito(servicioActivos.obtenerTodosActivos()));
    }

    /**
     * Retorna los datos de un activo específico identificado por su ticker.
     *
     * Ejemplo: GET http://localhost:8080/api/v1/assets/ECOPETROL
     *          GET http://localhost:8080/api/v1/assets/AAPL
     *
     * @param ticker Símbolo bursátil en la URL (p.ej. "ECOPETROL", "AAPL")
     * @return HTTP 200 con el DtoActivo, o HTTP 404 si el ticker no existe
     */
    @GetMapping("/{ticker}")
    @Operation(summary = "Obtener un activo por ticker",
               description = "Retorna los datos de un activo específico. Lanza 404 si no existe.")
    public ResponseEntity<RespuestaApi<DtoActivo>> obtenerActivo(
            @PathVariable
            @Parameter(description = "Ticker del activo (ej: ECOPETROL, AAPL, QQQ)")
            String ticker) {
        return ResponseEntity.ok(RespuestaApi.exito(servicioActivos.obtenerDtoActivo(ticker)));
    }

    /**
     * Retorna la serie OHLCV (barras de precios) de un activo, completa o parcial.
     *
     * Ejemplos:
     *   GET /api/v1/assets/ECOPETROL/ohlcv         → serie completa (~901 barras)
     *   GET /api/v1/assets/ECOPETROL/ohlcv?days=90 → últimas 90 barras
     *
     * @param ticker Símbolo bursátil del activo
     * @param dias   Número de barras más recientes a retornar (0 o ausente = toda la serie)
     * @return HTTP 200 con la lista de DtoBarraOhlcv en orden cronológico
     */
    @GetMapping("/{ticker}/ohlcv")
    @Operation(summary = "Serie OHLCV completa o parcial",
               description = "Retorna la serie histórica de barras OHLCV. Use '?days=90' para las últimas 90 barras.")
    public ResponseEntity<RespuestaApi<List<DtoBarraOhlcv>>> obtenerOhlcv(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "0")
            @Parameter(description = "Número de barras a retornar (0 = serie completa)")
            int days) {

        // Obtiene la serie (completa o parcial según el parámetro 'days')
        List<BarraOhlcv> serie = days > 0
                ? servicioActivos.obtenerSerie(ticker, days)
                : servicioActivos.obtenerSerie(ticker);

        // Convierte cada BarraOhlcv interna a DtoBarraOhlcv para la respuesta JSON
        List<DtoBarraOhlcv> barras = serie.stream()
                .map(barra -> DtoBarraOhlcv.builder()
                        .date(barra.getFecha())        // Fecha en "YYYY-MM-DD"
                        .open(barra.getApertura())     // Precio de apertura
                        .high(barra.getMaximo())       // Precio máximo
                        .low(barra.getMinimo())        // Precio mínimo
                        .close(barra.getCierre())      // Precio de cierre
                        .volume(barra.getVolumen())    // Volumen negociado
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(RespuestaApi.exito(barras));
    }

    /**
     * Calcula y retorna la Media Móvil Simple (SMA) para un activo.
     *
     * La SMA de ventana W suaviza los precios promediando los últimos W días.
     * Las primeras (W-1) posiciones retornan null (no hay suficientes datos).
     *
     * Ejemplo: GET /api/v1/assets/ECOPETROL/sma?window=20&days=252
     *
     * @param ticker Símbolo bursátil del activo
     * @param window Tamaño de la ventana de la SMA (default 20 = SMA-20)
     * @param days   Número de días de la serie a usar (0 = serie completa)
     * @return HTTP 200 con las fechas y valores de la SMA (null donde no hay datos suficientes)
     */
    @GetMapping("/{ticker}/sma")
    @Operation(summary = "Media Móvil Simple (SMA)",
               description = "Calcula la SMA con la ventana indicada. Las primeras (window-1) posiciones son null.")
    public ResponseEntity<RespuestaApi<Object>> obtenerSma(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "20") int window,
            @RequestParam(defaultValue = "0") int days) {

        // Obtiene la serie de precios para el período solicitado
        List<BarraOhlcv> serie = days > 0
                ? servicioActivos.obtenerSerie(ticker, days)
                : servicioActivos.obtenerSerie(ticker);

        // Extrae solo los precios de cierre como array primitivo para el cálculo
        double[] cierres = serie.stream().mapToDouble(BarraOhlcv::getCierre).toArray();

        // Calcula la Media Móvil Simple con la ventana solicitada
        Double[] valoresSma = algoritmos.mediaMovilSimple(cierres, window);

        // Extrae las fechas correspondientes a cada barra
        List<String> fechas  = serie.stream().map(BarraOhlcv::getFecha).collect(Collectors.toList());

        // Convierte el array Double[] a lista para la serialización JSON
        List<Double> valores = Arrays.asList(valoresSma);

        // Construye el objeto de respuesta con ticker, ventana, fechas y valores SMA
        var resultado = new java.util.LinkedHashMap<String, Object>();
        resultado.put("ticker", ticker.toUpperCase());   // Ticker normalizado
        resultado.put("window", window);                  // Tamaño de la ventana usada
        resultado.put("dates",  fechas);                  // Fechas correspondientes
        resultado.put("values", valores);                 // Valores SMA (null al inicio)

        return ResponseEntity.ok(RespuestaApi.exito(resultado));
    }
}
