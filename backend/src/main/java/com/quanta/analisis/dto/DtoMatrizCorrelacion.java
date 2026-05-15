package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO que representa la matriz de correlación de Pearson entre todos los activos.
 *
 * La matriz es cuadrada (N×N) y simétrica: la correlación entre el activo i y el j
 * es igual a la correlación entre j e i. La diagonal siempre es 1.0 (correlación
 * de un activo consigo mismo).
 *
 * Esta estructura es la base del mapa de calor (heatmap) de correlaciones
 * que se muestra en el dashboard del frontend.
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Patrón builder para construcción fluida
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class DtoMatrizCorrelacion {

    /**
     * Lista ordenada de tickers — define el orden de filas y columnas.
     * Ejemplo: ["ECOPETROL", "ISA", "GEB", ..., "XOM"]
     * tickers.get(i) corresponde a la fila/columna i de la matriz.
     */
    private List<String> tickers;

    /**
     * Matriz NxN de correlaciones de Pearson sobre retornos diarios.
     * matrix[i][j] = correlación de Pearson entre tickers[i] y tickers[j].
     * Rango de cada valor: [-1.0, 1.0]
     *   - 1.0  → correlación perfecta positiva (se mueven igual)
     *   - 0.0  → sin correlación lineal
     *   - -1.0 → correlación perfecta negativa (se mueven al revés)
     */
    private double[][] matrix;
}
