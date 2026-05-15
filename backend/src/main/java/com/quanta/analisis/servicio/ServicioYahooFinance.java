package com.quanta.analisis.servicio;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Servicio de extracción de datos históricos OHLCV desde la API pública de Yahoo Finance.
 *
 * Implementa el paso "Extract" del pipeline ETL mediante peticiones HTTP explícitas,
 * sin uso de librerías de alto nivel como yfinance o pandas_datareader.
 *
 * Endpoint utilizado: https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5y
 *
 * La respuesta JSON se parsea manualmente con Jackson (ObjectMapper), construyendo
 * la consulta, manejando errores HTTP y parseando la estructura de respuesta de forma
 * completamente explícita.
 *
 * Manejo de errores:
 *   - Reintentos con backoff lineal (hasta MAX_REINTENTOS intentos)
 *   - Timeout configurable por petición
 *   - Trato especial para HTTP 429 (rate limit): espera y reintenta
 *   - Lanza RuntimeException si todos los reintentos fallan
 */
@Slf4j
@Service
public class ServicioYahooFinance {

    private static final String BASE_URL  = "https://query1.finance.yahoo.com/v8/finance/chart/";
    private static final String PARAMS    = "?interval=1d&range=5y";

    // Cabecera User-Agent requerida; Yahoo Finance rechaza peticiones sin ella
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    private static final int MAX_REINTENTOS = 3;
    private static final int TIMEOUT_SEG    = 20;

    private final HttpClient   httpClient;
    private final ObjectMapper mapper;

    public ServicioYahooFinance(ObjectMapper mapper) {
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(TIMEOUT_SEG))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * Descarga la serie histórica OHLCV de un símbolo desde Yahoo Finance.
     *
     * Proceso algorítmico:
     *   1. Construye la URL con el símbolo y los parámetros de consulta (interval=1d, range=5y)
     *   2. Realiza la petición HTTP GET con cabeceras adecuadas (User-Agent, Accept)
     *   3. Si recibe HTTP 429 (rate limit), espera con backoff y reintenta
     *   4. Parsea el JSON de respuesta manualmente con Jackson (no librerías de alto nivel)
     *   5. Convierte timestamps Unix (segundos desde epoch) a fechas ISO-8601
     *   6. Filtra barras con valores nulos (días sin negociación en Yahoo Finance)
     *   7. Garantiza coherencia OHLCV: High ≥ max(Open,Close), Low ≤ min(Open,Close)
     *   8. Ordena cronológicamente (ascendente)
     *
     * Complejidad: O(n) donde n = número de barras retornadas por Yahoo Finance (~1260 para 5 años)
     *
     * @param simboloYahoo Símbolo en Yahoo Finance (p.ej. "AAPL", "EC", "CSPX.L", "VOO")
     * @return Lista de barras OHLCV en orden cronológico ascendente
     * @throws Exception Si la descarga falla después de todos los reintentos
     */
    public List<BarraOhlcv> descargarSerie(String simboloYahoo) throws Exception {
        String url = BASE_URL + simboloYahoo + PARAMS;
        log.debug("Descargando datos Yahoo Finance: {}", url);

        Exception ultimoError = null;
        for (int intento = 1; intento <= MAX_REINTENTOS; intento++) {
            try {
                // Construcción explícita de la petición HTTP
                HttpRequest peticion = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", "application/json")
                        .header("Accept-Language", "en-US,en;q=0.9")
                        .timeout(Duration.ofSeconds(TIMEOUT_SEG))
                        .GET()
                        .build();

                // Envío de la petición y recepción de la respuesta
                HttpResponse<String> respuesta = httpClient.send(
                        peticion, HttpResponse.BodyHandlers.ofString());

                if (respuesta.statusCode() == 429) {
                    // Rate limit: espera exponencial antes de reintentar
                    long espera = 2000L * intento;
                    log.warn("Rate limit (429) para {}. Esperando {}ms antes de reintento {}/{}",
                            simboloYahoo, espera, intento, MAX_REINTENTOS);
                    Thread.sleep(espera);
                    continue;
                }

                if (respuesta.statusCode() != 200) {
                    throw new RuntimeException(
                            "HTTP " + respuesta.statusCode() + " al descargar " + simboloYahoo);
                }

                // Parsing manual de la respuesta JSON
                return parsearRespuesta(respuesta.body(), simboloYahoo);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw e;
            } catch (Exception e) {
                ultimoError = e;
                if (intento < MAX_REINTENTOS) {
                    log.warn("Intento {}/{} falló para {}: {}. Reintentando...",
                            intento, MAX_REINTENTOS, simboloYahoo, e.getMessage());
                    Thread.sleep(1000L * intento);
                }
            }
        }
        throw new RuntimeException(
                "Descarga fallida para " + simboloYahoo + " tras " + MAX_REINTENTOS +
                " intentos: " + (ultimoError != null ? ultimoError.getMessage() : "error desconocido"),
                ultimoError);
    }

    /**
     * Parsea el cuerpo JSON de la respuesta de Yahoo Finance v8/finance/chart.
     *
     * Estructura del JSON de Yahoo Finance v8:
     * <pre>
     * {
     *   "chart": {
     *     "result": [{
     *       "timestamp": [epoch_segundos, ...],   // timestamps Unix
     *       "indicators": {
     *         "quote": [{
     *           "open":   [double | null, ...],
     *           "high":   [double | null, ...],
     *           "low":    [double | null, ...],
     *           "close":  [double | null, ...],
     *           "volume": [long   | null, ...]
     *         }]
     *       }
     *     }],
     *     "error": null | { "code": "...", "description": "..." }
     *   }
     * }
     * </pre>
     *
     * Nota: Yahoo Finance incluye null en los arrays para días donde no hubo negociación.
     * Estas barras se filtran antes de construir la lista final.
     *
     * @param json    Cuerpo de la respuesta HTTP como String
     * @param simbolo Símbolo del activo (para mensajes de error)
     * @return Lista de barras OHLCV con datos válidos, ordenada cronológicamente
     */
    private List<BarraOhlcv> parsearRespuesta(String json, String simbolo) throws Exception {
        JsonNode raiz = mapper.readTree(json);
        JsonNode resultado = raiz.path("chart").path("result");

        if (resultado.isMissingNode() || resultado.isEmpty()) {
            JsonNode error = raiz.path("chart").path("error");
            String desc = error.isMissingNode() ? "sin datos" : error.path("description").asText("error desconocido");
            throw new RuntimeException("Yahoo Finance reportó error para " + simbolo + ": " + desc);
        }

        JsonNode primero    = resultado.get(0);
        JsonNode timestamps = primero.path("timestamp");

        if (timestamps.isEmpty()) {
            throw new RuntimeException("Yahoo Finance retornó serie vacía para " + simbolo);
        }

        // Extrae los arrays de precios del nodo "quote"
        JsonNode quote   = primero.path("indicators").path("quote").get(0);
        JsonNode opens   = quote.path("open");
        JsonNode highs   = quote.path("high");
        JsonNode lows    = quote.path("low");
        JsonNode closes  = quote.path("close");
        JsonNode volumes = quote.path("volume");

        List<BarraOhlcv> barras = new ArrayList<>(timestamps.size());
        ZoneId utc = ZoneId.of("UTC");

        for (int i = 0; i < timestamps.size(); i++) {
            // Filtra barras donde el precio de cierre es null (días sin negociación)
            if (closes.size() <= i || closes.get(i).isNull()) continue;

            // Convierte timestamp Unix (segundos) a fecha ISO-8601
            long epochSeg = timestamps.get(i).asLong();
            LocalDate fecha = Instant.ofEpochSecond(epochSeg).atZone(utc).toLocalDate();

            double cierre   = closes.get(i).asDouble();
            double apertura = getDouble(opens,   i, cierre);
            double maximo   = getDouble(highs,   i, cierre);
            double minimo   = getDouble(lows,    i, cierre);
            long   volumen  = getLong  (volumes, i, 0L);

            // Garantiza coherencia OHLCV: High ≥ max(Open,Close), Low ≤ min(Open,Close)
            maximo = Math.max(maximo, Math.max(apertura, cierre));
            minimo = Math.min(minimo, Math.min(apertura, cierre));

            barras.add(BarraOhlcv.builder()
                    .fecha(fecha.toString())
                    .apertura(apertura)
                    .maximo(maximo)
                    .minimo(minimo)
                    .cierre(cierre)
                    .volumen(volumen)
                    .build());
        }

        // Ordena por fecha ascendente (Yahoo Finance generalmente ya las entrega ordenadas)
        barras.sort(Comparator.comparing(BarraOhlcv::getFecha));
        log.debug("Yahoo Finance: {} barras descargadas para {}", barras.size(), simbolo);
        return barras;
    }

    // ── Utilidades de extracción segura de valores del JSON ─────────────────────

    /** Retorna el double del nodo[i] o el valor por defecto si es null o fuera de rango */
    private double getDouble(JsonNode nodo, int i, double defecto) {
        if (nodo.size() <= i || nodo.get(i).isNull()) return defecto;
        return nodo.get(i).asDouble(defecto);
    }

    /** Retorna el long del nodo[i] o el valor por defecto si es null o fuera de rango */
    private long getLong(JsonNode nodo, int i, long defecto) {
        if (nodo.size() <= i || nodo.get(i).isNull()) return defecto;
        return nodo.get(i).asLong(defecto);
    }
}
