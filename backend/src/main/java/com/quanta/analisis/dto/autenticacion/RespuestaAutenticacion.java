package com.quanta.analisis.dto.autenticacion;

import com.quanta.analisis.dominio.modelo.Usuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que el servidor retorna al cliente tras un login o registro exitoso.
 *
 * Contiene el token JWT para autenticación de futuras peticiones y la
 * información básica del usuario para mostrar en la interfaz (nombre, email).
 *
 * El cliente debe almacenar el token (p.ej. en localStorage) y enviarlo
 * en el header "Authorization: Bearer <token>" en peticiones protegidas.
 *
 * Ejemplo de JSON retornado:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiJ9...",
 *   "user": { "id": "uuid-...", "name": "Admin Quanta", "email": "admin@quanta.com" }
 * }
 */
@Data              // Getters, setters, equals, hashCode, toString
@Builder           // Patrón builder para construcción fluida
@NoArgsConstructor // Constructor vacío para deserialización
@AllArgsConstructor // Constructor completo
public class RespuestaAutenticacion {

    /**
     * Token JWT firmado con HS256.
     * Válido por 24 horas desde el momento de emisión.
     * El cliente lo usa como credencial en peticiones protegidas.
     */
    private String token;

    /** Información básica del usuario autenticado (sin datos sensibles) */
    private InfoUsuario user;

    /**
     * Subclase estática que contiene los datos del usuario a exponer en la API.
     * Se excluyen intencionalmente: hashContrasena y otros datos internos.
     * Las anotaciones Lombok generan el mismo patrón builder/getters para esta clase anidada.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InfoUsuario {

        /** Identificador único UUID del usuario */
        private String id;

        /** Nombre completo del usuario */
        private String name;

        /** Correo electrónico del usuario */
        private String email;

        /**
         * Convierte un objeto Usuario del dominio a InfoUsuario para la respuesta API.
         * Actúa como método de fábrica estático que mapea solo los campos públicos.
         *
         * @param usuario Entidad de dominio con todos los datos del usuario
         * @return InfoUsuario con solo los campos seguros para exponer en la API
         */
        public static InfoUsuario desde(Usuario usuario) {
            return InfoUsuario.builder()
                    .id(usuario.getId())          // Copia el UUID del usuario
                    .name(usuario.getNombre())     // Copia el nombre completo
                    .email(usuario.getEmail())     // Copia el email
                    .build();
        }
    }
}
