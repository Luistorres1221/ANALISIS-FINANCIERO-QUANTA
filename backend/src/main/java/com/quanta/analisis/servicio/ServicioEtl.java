package com.quanta.analisis.servicio;

import com.quanta.analisis.algoritmo.AlgoritmosFinancieros;
import com.quanta.analisis.dto.DtoEstadoEtl;
import com.quanta.analisis.dto.DtoMatrizCorrelacion;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Servicio del pipeline ETL (Extract, Transform, Load) y análisis de correlación.
 *
 * Responsabilidades:
 *   1. Reportar el estado del pipeline ETL (activos cargados, observaciones, tiempo)
 *   2. Exponer el endpoint de refresco (re-generación de datos)
 *   3. Construir la matriz de correlación de Pearson 20×20 entre todos los activos
 *
 * La construcción de la matriz de correlación es O(n²/2) aprovechando la simetría:
 * si ya calculamos correlación(A, B), no necesitamos calcular correlación(B, A)
 * porque son el mismo valor.
 *
 * @Slf4j genera el campo 'log' para registrar eventos del ETL.
 * @Service y @RequiredArgsConstructor: Spring inyecta ServicioActivos y AlgoritmosFinancieros.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServicioEtl {

    /** Servicio de activos para consultar el estado del pipeline y las series */
    private final ServicioActivos       servicioActivos;

    /** Algoritmos financieros — se usa específicamente la correlación de Pearson */
    private final AlgoritmosFinancieros algoritmos;

    /**
     * Retorna el estado actual del pipeline ETL con estadísticas de carga.
     * Lee directamente del ServicioActivos sin recalcular nada.
     *
     * @return DtoEstadoEtl con el estado "READY" y estadísticas de los datos cargados
     */
    public DtoEstadoEtl obtenerEstado() {
        java.util.Map<String, String> fuentes = servicioActivos.getFuenteDatos();
        long yahoo = fuentes.values().stream().filter("YAHOO_FINANCE"::equals).count();
        return DtoEstadoEtl.builder()
                .status("READY")
                .assetsLoaded(servicioActivos.obtenerTickers().size())
                .totalObservations(servicioActivos.totalObservaciones())
                .lastRunAt(servicioActivos.getUltimaEjecucion())
                .generationMs(servicioActivos.getTiempoGeneracionMs())
                .dataPointsPerAsset(servicioActivos.barrasPorActivo())
                .fuentesDatos(fuentes)
                .activosYahooFinance((int) yahoo)
                .activosPrngFallback((int) (fuentes.size() - yahoo))
                .build();
    }

    /**
     * Re-ejecuta el pipeline ETL completo y retorna el nuevo estado.
     * Como el PRNG es determinista, el resultado siempre es idéntico.
     *
     * @return DtoEstadoEtl con el estado actualizado tras la regeneración
     */
    public DtoEstadoEtl actualizarDatos() {
        log.info("Actualización ETL solicitada vía API REST");
        servicioActivos.actualizarDatos();  // Limpia el cache y regenera todo
        return obtenerEstado();              // Retorna el estado actualizado
    }

    /**
     * Construye la matriz de correlación de Pearson entre todos los activos.
     *
     * Algoritmo de construcción (O(n²/2) aprovechando la simetría):
     *   - La diagonal siempre es 1.0 (correlación de un activo consigo mismo)
     *   - Para j < i: copia el valor ya calculado (matrix[i][j] = matrix[j][i])
     *   - Para j > i: calcula la correlación de Pearson con los retornos diarios
     *
     * Los retornos del activo i se calculan UNA VEZ por fila (no en cada celda j)
     * para evitar recalcularlos innecesariamente (optimización de rendimiento).
     *
     * @return DtoMatrizCorrelacion con la lista de tickers y la matriz NxN de correlaciones
     */
    public DtoMatrizCorrelacion construirMatrizCorrelacion() {
        List<String> tickers = servicioActivos.obtenerTickers();  // Lista ordenada de tickers
        int n = tickers.size();                                    // Número de activos (20)
        double[][] matriz = new double[n][n];                      // Reserva la matriz NxN

        for (int i = 0; i < n; i++) {
            // Calcula los retornos diarios del activo i UNA SOLA VEZ para toda la fila
            double[] retornosI = algoritmos.calcularRetornos(
                    servicioActivos.obtenerSerie(tickers.get(i)));

            for (int j = 0; j < n; j++) {
                if (i == j) {
                    // La correlación de un activo consigo mismo es siempre 1.0 (diagonal)
                    matriz[i][j] = 1.0;

                } else if (j < i) {
                    // Ya calculamos correlacion(j, i) antes — la matriz es simétrica
                    // así que copiamos el valor ya calculado en la posición espejo
                    matriz[i][j] = matriz[j][i];

                } else {
                    // Calcula la correlación de Pearson entre el activo i y el activo j
                    double[] retornosJ = algoritmos.calcularRetornos(
                            servicioActivos.obtenerSerie(tickers.get(j)));
                    matriz[i][j] = algoritmos.correlacionPearson(retornosI, retornosJ);
                }
            }
        }

        // Empaqueta la lista de tickers y la matriz en el DTO de respuesta
        return DtoMatrizCorrelacion.builder()
                .tickers(tickers)  // Orden de filas y columnas
                .matrix(matriz)    // Matriz NxN de correlaciones
                .build();
    }
}
