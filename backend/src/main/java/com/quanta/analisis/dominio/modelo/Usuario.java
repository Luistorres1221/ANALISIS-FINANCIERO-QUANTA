package com.quanta.analisis.dominio.modelo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Representa un usuario registrado en el sistema de autenticación.
 *
 * Los usuarios se almacenan en memoria (ConcurrentHashMap) durante la sesión del servidor.
 * Al reiniciar el servidor, solo persiste el usuario demo sembrado en el arranque.
 *
 * La contraseña NUNCA se guarda en texto plano — siempre se almacena como hash BCrypt.
 */
@Data              // Genera getters, setters, equals, hashCode y toString
@Builder           // Permite construir usuarios con sintaxis: Usuario.builder().id(...).build()
@NoArgsConstructor // Constructor vacío necesario para frameworks de serialización
@AllArgsConstructor // Constructor completo con todos los campos
public class Usuario {

    /** Identificador único del usuario, generado con UUID al momento del registro */
    private String id;

    /** Nombre completo del usuario (p.ej. "Admin Quanta") */
    private String nombre;

    /** Correo electrónico — usado como identificador de inicio de sesión */
    private String email;

    /**
     * Hash BCrypt de la contraseña del usuario.
     * BCrypt es un algoritmo de hash adaptativo diseñado para contraseñas:
     * es deliberadamente lento para resistir ataques de fuerza bruta.
     * Formato: $2a$10$... (incluye el factor de costo y el salt embebidos)
     */
    private String hashContrasena;
}
