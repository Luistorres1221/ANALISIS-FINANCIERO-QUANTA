package com.quanta.analisis.servicio;

import com.quanta.analisis.algoritmo.AlgoritmosFinancieros;
import com.quanta.analisis.dominio.modelo.Activo;
import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import com.quanta.analisis.dto.DtoResultadoSimilitud;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Servicio que calcula la similitud entre pares de activos financieros.
 *
 * Orquesta los cuatro algoritmos de similitud implementados en AlgoritmosFinancieros:
 *   1. Pearson  — correlación lineal de retornos diarios
 *   2. Coseno   — similitud de dirección en espacio vectorial de precios
 *   3. Euclidiana — distancia de forma entre precios normalizados (z-score)
 *   4. DTW      — similitud con deformación temporal (Dynamic Time Warping)
 *
 * Permite comparar dos activos cualquiera en una ventana de días configurable.
 * Si la ventana es 0, usa toda la historia disponible.
 *
 * @Service indica que es un servicio de negocio Spring.
 * @RequiredArgsConstructor genera el constructor inyectando ServicioActivos y AlgoritmosFinancieros.
 */
@Service
@RequiredArgsConstructor
public class ServicioSimilitud {

    /** Ancho de banda Sakoe-Chiba para el algoritmo DTW (en días de negociación) */
    private static final int BANDA_DTW = 20;

    /** Servicio de activos para obtener series históricas */
    private final ServicioActivos    servicioActivos;

    /** Biblioteca de algoritmos financieros con todas las métricas de similitud */
    private final AlgoritmosFinancieros algoritmos;

    /**
     * Compara dos activos con los cuatro algoritmos de similitud.
     *
     * Proceso:
     *   1. Obtiene los objetos Activo de ambos tickers
     *   2. Extrae las series OHLCV para la ventana de días solicitada
     *   3. Calcula retornos diarios (para Pearson) y precios de cierre (para los demás)
     *   4. Ejecuta los 4 algoritmos y empaqueta los resultados en el DTO
     *
     * @param tickerA Ticker del primer activo (p.ej. "ECOPETROL")
     * @param tickerB Ticker del segundo activo (p.ej. "AAPL")
     * @param dias    Ventana en días (0 = toda la serie disponible)
     * @return DtoResultadoSimilitud con los 4 métricas calculadas
     */
    public DtoResultadoSimilitud comparar(String tickerA, String tickerB, int dias) {
        // Normaliza los tickers a mayúsculas para consistencia
        tickerA = tickerA.toUpperCase();
        tickerB = tickerB.toUpperCase();

        // Obtiene los metadatos de cada activo (nombre, mercado, sector)
        Activo activoA = servicioActivos.obtenerActivo(tickerA);
        Activo activoB = servicioActivos.obtenerActivo(tickerB);

        // Obtiene las series OHLCV para la ventana solicitada
        // Si dias > 0, usa los últimos 'dias' días; si dias = 0, usa la serie completa
        List<BarraOhlcv> serieA = dias > 0
                ? servicioActivos.obtenerSerie(tickerA, dias)
                : servicioActivos.obtenerSerie(tickerA);
        List<BarraOhlcv> serieB = dias > 0
                ? servicioActivos.obtenerSerie(tickerB, dias)
                : servicioActivos.obtenerSerie(tickerB);

        // Calcula los retornos diarios de cada serie (necesarios para Pearson)
        double[] retornosA = algoritmos.calcularRetornos(serieA);
        double[] retornosB = algoritmos.calcularRetornos(serieB);

        // Extrae los precios de cierre como arrays (necesarios para Coseno, Euclidiana y DTW)
        double[] preciosA = serieA.stream().mapToDouble(BarraOhlcv::getCierre).toArray();
        double[] preciosB = serieB.stream().mapToDouble(BarraOhlcv::getCierre).toArray();

        // Construye el resultado con las 4 métricas calculadas
        return DtoResultadoSimilitud.builder()
                .tickerA(activoA.getTicker())                                   // Ticker A
                .tickerB(activoB.getTicker())                                   // Ticker B
                .nameA(activoA.getNombre())                                     // Nombre activo A
                .nameB(activoB.getNombre())                                     // Nombre activo B
                .pearson(algoritmos.correlacionPearson(retornosA, retornosB))  // Correlación Pearson
                .cosine(algoritmos.similitudCoseno(preciosA, preciosB))         // Similitud Coseno
                .euclidean(algoritmos.distanciaEuclidiana(preciosA, preciosB)) // Distancia Euclidiana
                .dtw(algoritmos.deformacionDinamica(preciosA, preciosB, BANDA_DTW)) // DTW
                .windowDays(Math.min(serieA.size(), serieB.size()))            // Días efectivos usados
                .build();
    }
}
