package com.quanta.analisis.excepcion;

import com.quanta.analisis.dto.RespuestaApi;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Manejador global de excepciones para todos los controladores REST.
 *
 * @RestControllerAdvice hace que esta clase intercepte las excepciones lanzadas
 * por cualquier @RestController antes de que lleguen al cliente. Esto centraliza
 * el manejo de errores en un único lugar, evitando try-catch en cada controlador.
 *
 * @Slf4j inyecta un logger de SLF4J para registrar errores en la consola.
 * Cada @ExceptionHandler maneja un tipo específico de excepción y retorna
 * la respuesta HTTP apropiada envuelta en RespuestaApi.
 */
@Slf4j                 // Genera el campo 'log' para registro de eventos
@RestControllerAdvice  // Intercepta excepciones de todos los @RestController
public class ManejadorExcepciones {

    /**
     * Maneja el caso en que se busca un activo con ticker inexistente.
     * Retorna HTTP 404 Not Found con el mensaje del ticker no encontrado.
     *
     * @param ex Excepción capturada que contiene el ticker inválido
     * @return Respuesta HTTP 404 con mensaje de error
     */
    @ExceptionHandler(ExcepcionActivoNoEncontrado.class)
    public ResponseEntity<RespuestaApi<Void>> manejarActivoNoEncontrado(ExcepcionActivoNoEncontrado ex) {
        // Registra una advertencia (no es un error crítico, es un request inválido)
        log.warn("Activo no encontrado: {}", ex.getMessage());
        // Retorna 404 con el mensaje descriptivo de la excepción
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(RespuestaApi.error(ex.getMessage()));
    }

    /**
     * Maneja argumentos inválidos como email ya registrado o contraseñas incorrectas.
     * Retorna HTTP 400 Bad Request con el mensaje de validación.
     *
     * @param ex Excepción con la descripción del argumento inválido
     * @return Respuesta HTTP 400 con mensaje de error
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<RespuestaApi<Void>> manejarArgumentoInvalido(IllegalArgumentException ex) {
        // Registra como advertencia — es un error del cliente, no del servidor
        log.warn("Argumento inválido en la petición: {}", ex.getMessage());
        // Retorna 400 indicando que el cliente envió datos incorrectos
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(RespuestaApi.error(ex.getMessage()));
    }

    /**
     * Maneja parámetros de URL con tipo incorrecto (p.ej. "abc" donde se espera un número).
     * Retorna HTTP 400 Bad Request con el nombre del parámetro y el valor recibido.
     *
     * @param ex Excepción que indica el parámetro inválido y su valor
     * @return Respuesta HTTP 400 con mensaje descriptivo del parámetro fallido
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<RespuestaApi<Void>> manejarTipoIncorrecto(MethodArgumentTypeMismatchException ex) {
        // Construye un mensaje legible indicando qué parámetro falló y por qué
        String mensaje = "Parámetro inválido '" + ex.getName() + "': " + ex.getValue();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(RespuestaApi.error(mensaje));
    }

    /**
     * Captura cualquier excepción no manejada por los handlers anteriores.
     * Retorna HTTP 500 Internal Server Error para evitar exponer detalles internos.
     *
     * @param ex Cualquier excepción no esperada
     * @return Respuesta HTTP 500 con mensaje genérico
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<RespuestaApi<Void>> manejarErrorGenerico(Exception ex) {
        // Registra el stack trace completo porque es un error inesperado del servidor
        log.error("Error inesperado en el servidor", ex);
        // Retorna un mensaje genérico al cliente (no exponer detalles de implementación)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(RespuestaApi.error("Error interno del servidor"));
    }
}
