package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que representa una barra OHLCV individual para las respuestas de la API.
 *
 * Este objeto se serializa a JSON y se envía al frontend para construir
 * gráficos de velas (candlestick charts) y realizar análisis técnico.
 *
 * Los nombres de los campos coinciden con la convención del frontend TypeScript
 * para facilitar la integración sin transformaciones adicionales.
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Permite construir barras con sintaxis fluida
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class DtoBarraOhlcv {

    /** Fecha de negociación en formato "YYYY-MM-DD" */
    private String date;

    /** Precio de apertura de la sesión */
    private double open;

    /** Precio máximo alcanzado durante la sesión */
    private double high;

    /** Precio mínimo alcanzado durante la sesión */
    private double low;

    /** Precio de cierre de la sesión */
    private double close;

    /** Volumen total de unidades negociadas en la sesión */
    private long volume;
}
