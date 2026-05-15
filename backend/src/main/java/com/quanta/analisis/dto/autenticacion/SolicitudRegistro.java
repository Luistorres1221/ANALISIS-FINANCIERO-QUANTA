package com.quanta.analisis.dto.autenticacion;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO que recibe el cuerpo (body) de la solicitud HTTP de registro de nuevo usuario.
 *
 * Spring valida automáticamente las restricciones de Bean Validation (@NotBlank, @Email, @Size)
 * antes de procesar la petición. Si alguna falla, se retorna HTTP 400 automáticamente.
 *
 * Ejemplo de JSON esperado:
 * {
 *   "name": "Carlos Rodríguez",
 *   "email": "carlos@empresa.com",
 *   "password": "miContrasena123"
 * }
 */
@Data // Genera getters, setters, equals, hashCode y toString
public class SolicitudRegistro {

    /**
     * Nombre completo del nuevo usuario.
     * @NotBlank impide nombres vacíos o nulos.
     */
    @NotBlank
    private String name;

    /**
     * Correo electrónico — será el identificador único de la cuenta.
     * @Email valida el formato, @NotBlank impide valores vacíos.
     * El sistema verifica que no exista otro usuario con el mismo email.
     */
    @Email
    @NotBlank
    private String email;

    /**
     * Contraseña deseada en texto plano.
     * Se hashea con BCrypt antes de guardarse en memoria.
     * @Size(min=6) garantiza una longitud mínima de seguridad.
     */
    @NotBlank
    @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
    private String password;
}
