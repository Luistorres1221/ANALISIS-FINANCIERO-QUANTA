package com.quanta.analisis.configuracion;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuración de Spring Security para la cadena de filtros de seguridad HTTP.
 *
 * Define qué endpoints son públicos y cuáles requieren autenticación,
 * y cómo se maneja la sesión del usuario (stateless = sin estado en el servidor).
 *
 * Como es una aplicación de datos de demostración sin sensibilidad real,
 * todos los endpoints de análisis son públicos. Solo la gestión de usuarios
 * (login/registro) requiere la infraestructura de seguridad completa para
 * manejar correctamente los tokens JWT.
 *
 * @EnableWebSecurity activa la seguridad web de Spring y desactiva las configuraciones por defecto.
 */
@Configuration      // Clase de configuración de Spring
@EnableWebSecurity  // Activa Spring Security y sus filtros
public class ConfiguracionSeguridad {

    /**
     * Define la cadena de filtros de seguridad HTTP que Spring aplica a cada petición.
     *
     * El orden de configuración importa: CORS debe ir primero, luego CSRF,
     * luego las reglas de autorización.
     *
     * @param http Constructor de la cadena de filtros provisto por Spring Security
     * @return Cadena de filtros construida y lista para registrarse como bean
     * @throws Exception Si hay un error en la configuración de seguridad
     */
    @Bean
    SecurityFilterChain cadenaFiltros(HttpSecurity http) throws Exception {
        return http
                // Activa CORS usando el CorsConfigurationSource bean de ConfiguracionCors
                // Esto permite que el frontend en otro puerto pueda hacer peticiones
                .cors(Customizer.withDefaults())

                // Desactiva CSRF (Cross-Site Request Forgery) porque usamos JWT stateless,
                // no cookies de sesión, por lo que los ataques CSRF no aplican
                .csrf(AbstractHttpConfigurer::disable)

                // Configura la sesión como STATELESS: el servidor NO guarda estado de sesión.
                // Cada petición debe incluir el token JWT para identificarse.
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Define las reglas de autorización para cada tipo de endpoint
                .authorizeHttpRequests(auth -> auth
                        // Endpoints de autenticación — públicos para permitir login y registro
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // Documentación Swagger y actuator — públicos para facilitar el desarrollo
                        .requestMatchers(
                                "/swagger-ui/**", "/swagger-ui.html",
                                "/api-docs/**", "/v3/api-docs/**",
                                "/actuator/**").permitAll()

                        // Peticiones pre-flight OPTIONS — el navegador las envía antes de CORS
                        // Deben ser siempre permitidas para que CORS funcione correctamente
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Todos los demás endpoints — permitidos porque son datos de demo sin sensibilidad
                        .anyRequest().permitAll()
                )
                .build();
    }

    /**
     * Registra el codificador de contraseñas BCrypt como bean de Spring.
     *
     * BCrypt es el estándar de la industria para almacenar contraseñas:
     * aplica un factor de costo configurable (por defecto 10 rondas) que hace
     * que calcular el hash sea deliberadamente lento (~100ms), dificultando
     * ataques de fuerza bruta o con tablas arco iris (rainbow tables).
     *
     * @return PasswordEncoder basado en BCrypt con factor de costo por defecto (10)
     */
    @Bean
    PasswordEncoder codificadorContrasena() {
        return new BCryptPasswordEncoder();
    }
}
