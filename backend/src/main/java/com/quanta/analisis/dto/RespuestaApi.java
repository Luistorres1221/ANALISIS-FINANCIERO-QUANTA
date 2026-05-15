package com.quanta.analisis.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Envoltorio genérico para todas las respuestas REST de la API.
 *
 * Estandariza el formato JSON de salida: siempre incluye un campo "success",
 * los datos en "data", un mensaje descriptivo y el timestamp de la respuesta.
 *
 * El tipo genérico T permite reutilizar esta clase para cualquier tipo de dato:
 *   RespuestaApi<List<DtoActivo>>, RespuestaApi<DtoResultadoSimilitud>, etc.
 *
 * @param <T> Tipo del objeto que se incluye en el campo "data"
 */
@Data                                              // Getters, setters, equals, hashCode, toString
@Builder                                           // Patrón builder para construcción fluida
@NoArgsConstructor                                 // Constructor vacío para deserialización JSON
@AllArgsConstructor                                // Constructor completo
@JsonInclude(JsonInclude.Include.NON_NULL)          // Omite campos nulos en el JSON de salida
public class RespuestaApi<T> {

    /** Indica si la operación fue exitosa (true) o falló (false) */
    private boolean exitoso;

    /** Datos de la respuesta — es null en caso de error */
    private T datos;

    /** Mensaje descriptivo del resultado: "OK" en éxito, descripción del error en fallo */
    private String mensaje;

    /** Fecha y hora en que se generó la respuesta en formato ISO-8601 */
    private String timestamp;

    /**
     * Crea una respuesta exitosa con los datos proporcionados.
     * El mensaje se establece en "OK" y el timestamp se asigna automáticamente.
     *
     * @param datos Objeto de datos a incluir en la respuesta
     * @param <T>   Tipo del objeto de datos
     * @return RespuestaApi con exitoso=true y los datos incluidos
     */
    public static <T> RespuestaApi<T> exito(T datos) {
        return RespuestaApi.<T>builder()
                .exitoso(true)
                .datos(datos)
                .mensaje("OK")
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
    }

    /**
     * Crea una respuesta de error sin datos.
     * El campo "datos" queda en null y no se serializa en el JSON (por @JsonInclude).
     *
     * @param mensaje Descripción del error ocurrido
     * @param <T>     Tipo genérico (normalmente Void para errores)
     * @return RespuestaApi con exitoso=false y el mensaje de error
     */
    public static <T> RespuestaApi<T> error(String mensaje) {
        return RespuestaApi.<T>builder()
                .exitoso(false)
                .mensaje(mensaje)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
    }
}
