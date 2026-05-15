package com.quanta.analisis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO (Objeto de Transferencia de Datos) que representa un activo financiero
 * en las respuestas de la API REST.
 *
 * A diferencia del modelo de dominio Activo, este DTO solo expone los campos
 * necesarios para el cliente (frontend), omitiendo datos internos como la semilla
 * del PRNG, drift y volatilidad de configuración.
 *
 * Incluye datos calculados como el último precio de cierre y la cantidad de barras.
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Patrón builder para construcción cómoda
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class DtoActivo {

    /** Símbolo bursátil del activo (p.ej. "ECOPETROL", "AAPL") */
    private String ticker;

    /** Nombre completo de la empresa o fondo */
    private String name;

    /** Mercado donde cotiza: "BVC", "NYSE", "NASDAQ" o "AMEX" */
    private String market;

    /** Sector económico al que pertenece el activo */
    private String sector;

    /** Último precio de cierre disponible en la serie histórica */
    private double lastClose;

    /** Número total de barras OHLCV disponibles en la serie histórica */
    private int dataPoints;

    /**
     * Fuente de los datos históricos.
     * Valores: "YAHOO_FINANCE" (datos reales descargados) o "PRNG_FALLBACK" (datos sintéticos).
     */
    private String dataSource;
}
