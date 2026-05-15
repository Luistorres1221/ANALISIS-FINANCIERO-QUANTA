package com.quanta.analisis.excepcion;

/**
 * Excepción lanzada cuando se solicita un activo que no existe en el sistema.
 *
 * Al extender RuntimeException, no necesita declararse en la firma del método
 * (unchecked exception), lo que simplifica el código de los servicios.
 *
 * El ManejadorExcepciones la captura globalmente y retorna HTTP 404 (Not Found)
 * al cliente con un mensaje descriptivo.
 */
public class ExcepcionActivoNoEncontrado extends RuntimeException {

    /**
     * Crea la excepción con un mensaje que incluye el ticker no encontrado.
     *
     * @param ticker Símbolo bursátil que no existe en el sistema (p.ej. "INVALIDO")
     */
    public ExcepcionActivoNoEncontrado(String ticker) {
        // Llama al constructor de RuntimeException con el mensaje descriptivo
        super("Activo no encontrado: " + ticker);
    }
}
