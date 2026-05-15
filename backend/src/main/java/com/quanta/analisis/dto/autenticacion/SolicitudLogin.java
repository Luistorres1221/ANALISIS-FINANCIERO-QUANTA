package com.quanta.analisis.dto.autenticacion;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO que recibe el cuerpo (body) de la solicitud HTTP de inicio de sesión.
 *
 * Spring valida automáticamente las restricciones @Email y @NotBlank antes de
 * que el controlador procese la petición. Si la validación falla, Spring responde
 * con HTTP 400 (Bad Request) sin llegar al servicio de autenticación.
 *
 * Ejemplo de JSON esperado:
 * {
 *   "email": "admin@quanta.com",
 *   "password": "quanta123"
 * }
 */
@Data // Genera getters, setters, equals, hashCode y toString
public class SolicitudLogin {

    /**
     * Correo electrónico del usuario.
     * @Email valida que tenga formato válido (contiene "@" y dominio).
     * @NotBlank impide valores nulos o cadenas vacías/espacios.
     */
    @Email
    @NotBlank
    private String email;

    /**
     * Contraseña en texto plano enviada por el cliente.
     * Se compara contra el hash BCrypt almacenado en memoria.
     * @NotBlank impide contraseñas vacías.
     */
    @NotBlank
    private String password;
}
