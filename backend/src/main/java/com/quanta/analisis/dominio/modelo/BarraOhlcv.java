package com.quanta.analisis.dominio.modelo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Representa una barra de precios OHLCV (Open, High, Low, Close, Volume)
 * para un día de negociación bursátil.
 *
 * Cada barra contiene los cuatro precios clave del día más el volumen negociado.
 * Lombok genera automáticamente getters, setters, equals, hashCode, toString,
 * constructor vacío, constructor completo y el patrón builder.
 */
@Data              // Genera getters, setters, equals, hashCode y toString
@Builder           // Permite construir objetos con sintaxis fluida: BarraOhlcv.builder().date(...).build()
@NoArgsConstructor // Constructor sin argumentos requerido por frameworks de serialización
@AllArgsConstructor // Constructor con todos los campos para facilitar pruebas
public class BarraOhlcv {

    /** Fecha de la barra en formato ISO-8601: "YYYY-MM-DD" (p.ej. "2024-03-15") */
    private String fecha;

    /** Precio de apertura: primer precio al que se negoció en este día */
    private double apertura;

    /** Precio máximo: precio más alto alcanzado durante la sesión */
    private double maximo;

    /** Precio mínimo: precio más bajo alcanzado durante la sesión */
    private double minimo;

    /** Precio de cierre: último precio al que se negoció en este día */
    private double cierre;

    /** Volumen negociado: número total de acciones/unidades transadas en el día */
    private long volumen;
}
