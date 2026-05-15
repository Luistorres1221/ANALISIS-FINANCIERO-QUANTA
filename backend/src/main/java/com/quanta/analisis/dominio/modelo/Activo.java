package com.quanta.analisis.dominio.modelo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Representa un activo financiero (acción, ETF o índice) dentro del sistema.
 *
 * Contiene tanto los datos descriptivos del activo (ticker, nombre, mercado, sector)
 * como los parámetros de configuración usados por el generador de datos PRNG para
 * producir series históricas deterministas y reproducibles.
 *
 * Los 20 activos del sistema incluyen: BVC (Colombia), NYSE, NASDAQ y AMEX.
 */
@Data              // Genera getters, setters, equals, hashCode y toString
@Builder           // Patrón builder para crear activos de forma legible
@NoArgsConstructor // Constructor vacío necesario para frameworks
@AllArgsConstructor // Constructor completo con todos los campos
public class Activo {

    /** Símbolo bursátil único (p.ej. "ECOPETROL", "AAPL", "QQQ") */
    private String ticker;

    /**
     * Símbolo del activo en Yahoo Finance para la descarga de datos reales.
     * Puede diferir del ticker interno (p.ej. ECOPETROL → "EC" como ADR en NYSE,
     * PFBCOLOM → "CIB" como ADR de Bancolombia, activos BVC con sufijo ".CL").
     * Si es null o vacío, se usa el generador PRNG como fallback.
     */
    private String tickerYahoo;

    /** Nombre completo de la empresa o fondo (p.ej. "Apple Inc.", "Ecopetrol S.A.") */
    private String nombre;

    /** Mercado donde cotiza: "BVC" | "NYSE" | "NASDAQ" | "AMEX" */
    private String mercado;

    /** Sector económico al que pertenece (p.ej. "Tecnología", "Financiero", "Energía") */
    private String sector;

    // ── Parámetros de generación de datos (PRNG mulberry32) ──────────────────

    /** Semilla del generador de números pseudoaleatorios — única por activo para reproducibilidad */
    private int semilla;

    /** Precio inicial en la primera barra de la serie histórica */
    private double precioInicial;

    /**
     * Drift diario medio: tendencia esperada por día.
     * Valor positivo = tendencia alcista, negativo = bajista.
     * Ejemplo: 0.0003 equivale a +0.03% diario.
     */
    private double drift;

    /**
     * Volatilidad diaria: magnitud de las oscilaciones aleatorias.
     * Ejemplo: 0.018 equivale a ~1.8% de variación diaria aleatoria.
     */
    private double volatilidad;
}
