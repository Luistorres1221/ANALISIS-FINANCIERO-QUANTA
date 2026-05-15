package com.quanta.analisis.controlador;

import com.quanta.analisis.dto.autenticacion.RespuestaAutenticacion;
import com.quanta.analisis.dto.autenticacion.SolicitudLogin;
import com.quanta.analisis.dto.autenticacion.SolicitudRegistro;
import com.quanta.analisis.servicio.ServicioAutenticacion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST para autenticación de usuarios: login y registro.
 *
 * Expone los siguientes endpoints públicos (sin token JWT requerido):
 *   POST /api/v1/auth/login    — Inicia sesión y retorna un token JWT
 *   POST /api/v1/auth/register — Registra un nuevo usuario y retorna un token JWT
 *
 * Estos endpoints están marcados como públicos en ConfiguracionSeguridad
 * mediante .requestMatchers("/api/v1/auth/**").permitAll()
 *
 * El body de cada petición se valida automáticamente con @Valid:
 *   - Si la validación falla → Spring retorna HTTP 400 automáticamente
 *   - Si las credenciales son incorrectas → ManejadorExcepciones retorna HTTP 400
 *   - Si el registro es exitoso → retorna HTTP 201 Created
 *   - Si el login es exitoso → retorna HTTP 200 OK
 *
 * @RestController: controlador que serializa respuestas a JSON automáticamente
 * @RequestMapping: prefijo "/api/v1/auth"
 * @RequiredArgsConstructor: inyecta ServicioAutenticacion por constructor
 * @Tag: etiqueta descriptiva en la documentación Swagger UI
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Registro e inicio de sesión de usuarios")
public class ControladorAutenticacion {

    /** Servicio que maneja el registro, login y generación de tokens JWT */
    private final ServicioAutenticacion servicioAutenticacion;

    /**
     * Inicia sesión con email y contraseña.
     * Verifica las credenciales contra el almacén en memoria y retorna un token JWT.
     *
     * Ejemplo de body:
     * {
     *   "email": "admin@quanta.com",
     *   "password": "quanta123"
     * }
     *
     * @param solicitud Body JSON validado automáticamente por @Valid
     * @return HTTP 200 con RespuestaAutenticacion (token JWT + info del usuario)
     * @throws IllegalArgumentException Si el email no existe o la contraseña es incorrecta
     *         (interceptado por ManejadorExcepciones → HTTP 400)
     */
    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión",
               description = "Verifica email y contraseña. Retorna un token JWT válido por 24 horas.")
    public ResponseEntity<RespuestaAutenticacion> iniciarSesion(
            @RequestBody @Valid SolicitudLogin solicitud) {
        // Delega la autenticación al servicio y retorna la respuesta con el token
        return ResponseEntity.ok(
                servicioAutenticacion.iniciarSesion(
                        solicitud.getEmail(),     // Email extraído del body JSON
                        solicitud.getPassword()   // Contraseña extraída del body JSON
                ));
    }

    /**
     * Registra un nuevo usuario en el sistema.
     * Valida que el email sea único, hashea la contraseña y retorna un token JWT.
     *
     * Ejemplo de body:
     * {
     *   "name": "Carlos Rodríguez",
     *   "email": "carlos@empresa.com",
     *   "password": "miContrasena123"
     * }
     *
     * @param solicitud Body JSON validado automáticamente por @Valid
     * @return HTTP 201 Created con RespuestaAutenticacion (token JWT + info del nuevo usuario)
     * @throws IllegalArgumentException Si el email ya está registrado
     *         (interceptado por ManejadorExcepciones → HTTP 400)
     */
    @PostMapping("/register")
    @Operation(summary = "Registrar nuevo usuario",
               description = "Crea una cuenta nueva. El email debe ser único. Retorna token JWT.")
    public ResponseEntity<RespuestaAutenticacion> registrarUsuario(
            @RequestBody @Valid SolicitudRegistro solicitud) {
        // Registra el usuario y obtiene la respuesta con el token JWT
        RespuestaAutenticacion respuesta = servicioAutenticacion.registrarUsuario(
                solicitud.getName(),      // Nombre completo extraído del body
                solicitud.getEmail(),     // Email único extraído del body
                solicitud.getPassword()   // Contraseña extraída del body (se hasheará internamente)
        );
        // HTTP 201 Created indica que se creó un nuevo recurso (el usuario)
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }
}
