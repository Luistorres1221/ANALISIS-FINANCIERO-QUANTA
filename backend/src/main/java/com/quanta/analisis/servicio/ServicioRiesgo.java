package com.quanta.analisis.servicio;

import com.quanta.analisis.algoritmo.AlgoritmosFinancieros;
import com.quanta.analisis.dominio.modelo.Activo;
import com.quanta.analisis.dominio.modelo.BarraOhlcv;
import com.quanta.analisis.dto.DtoMetricasRiesgo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio que calcula las métricas de riesgo y rendimiento de cada activo.
 *
 * Para cada activo calcula:
 *   - Volatilidad anualizada (σ × √252): mide el riesgo total del activo
 *   - CAGR: rendimiento anual compuesto desde el inicio de la serie
 *   - Categoría de riesgo: Conservador / Moderado / Agresivo
 *   - Rachas alcistas de 5 días: frecuencia de tendencias positivas sostenidas
 *   - Patrones V detectados: frecuencia de recuperaciones rápidas tras caídas
 *
 * Estos datos alimentan la tabla de riesgo del dashboard del frontend.
 *
 * @Service indica que es un servicio de negocio Spring.
 * @RequiredArgsConstructor inyecta ServicioActivos y AlgoritmosFinancieros.
 */
@Service
@RequiredArgsConstructor
public class ServicioRiesgo {

    /** Servicio de activos para obtener series históricas */
    private final ServicioActivos       servicioActivos;

    /** Biblioteca de algoritmos con los cálculos de riesgo */
    private final AlgoritmosFinancieros algoritmos;

    /**
     * Calcula las métricas de riesgo para todos los activos del sistema.
     * Itera por cada ticker y llama a calcularMetricas() individualmente.
     *
     * @return Lista de DtoMetricasRiesgo, uno por cada activo (20 en total)
     */
    public List<DtoMetricasRiesgo> obtenerTodasMetricasRiesgo() {
        return servicioActivos.obtenerTickers().stream()
                .map(this::calcularMetricas)      // Calcula métricas para cada ticker
                .collect(Collectors.toList());     // Agrupa en una lista
    }

    /**
     * Calcula las métricas de riesgo de un activo específico.
     *
     * @param ticker Símbolo bursátil del activo (insensible a mayúsculas)
     * @return DtoMetricasRiesgo con todas las métricas calculadas
     */
    public DtoMetricasRiesgo obtenerMetricasRiesgo(String ticker) {
        return calcularMetricas(ticker.toUpperCase());  // Normaliza y delega al método privado
    }

    /**
     * Ejecuta todos los cálculos de riesgo para un activo específico.
     *
     * Proceso interno:
     *   1. Obtiene el objeto Activo con sus metadatos
     *   2. Obtiene la serie completa de barras OHLCV
     *   3. Calcula la volatilidad anualizada
     *   4. Usa la volatilidad para determinar la categoría de riesgo
     *   5. Calcula CAGR, patrones técnicos y empaqueta todo en el DTO
     *
     * @param ticker Símbolo bursátil normalizado (en mayúsculas)
     * @return DtoMetricasRiesgo con todas las métricas
     */
    private DtoMetricasRiesgo calcularMetricas(String ticker) {
        Activo        activo = servicioActivos.obtenerActivo(ticker);     // Metadatos del activo
        List<BarraOhlcv> serie = servicioActivos.obtenerSerie(ticker);    // Serie histórica completa
        BarraOhlcv    ultimaBarra = serie.get(serie.size() - 1);           // Última barra disponible

        // Calcula la volatilidad anualizada — base para la categoría de riesgo
        double volatilidad = algoritmos.volatiliadadAnualizada(serie);

        return DtoMetricasRiesgo.builder()
                .ticker(activo.getTicker())                                    // Símbolo bursátil
                .name(activo.getNombre())                                      // Nombre completo
                .market(activo.getMercado())                                   // Mercado (BVC, NYSE...)
                .sector(activo.getSector())                                    // Sector económico
                .annualizedVolatility(volatilidad)                            // σ × √252
                .cagr(algoritmos.tasaCrecimientoAnual(serie))                 // CAGR completo
                .riskCategory(algoritmos.categoriaRiesgo(volatilidad))        // Conservador/Moderado/Agresivo
                .upStreaks5(algoritmos.contarRachasAlcistas(serie, 5))        // Rachas de 5 días alcistas
                .vShapes(algoritmos.contarPatronesV(serie, 0.02))            // Patrones V con umbral 2%
                .lastClose(ultimaBarra.getCierre())                           // Último precio de cierre
                .dataPoints(serie.size())                                      // Total de barras
                .build();
    }
}
