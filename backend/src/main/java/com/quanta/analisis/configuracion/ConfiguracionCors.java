package com.quanta.analisis.configuracion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuración de CORS (Cross-Origin Resource Sharing) para el backend.
 *
 * CORS es un mecanismo de seguridad del navegador que bloquea peticiones HTTP
 * desde un origen (dominio + puerto) diferente al del servidor. Sin esta
 * configuración, el frontend en localhost:8081 no podría llamar al backend
 * en localhost:8080 porque son orígenes distintos.
 *
 * Esta clase expone un bean CorsConfigurationSource que Spring Security
 * usa automáticamente al configurar .cors(Customizer.withDefaults()).
 */
@Configuration // Indica que esta clase define beans de configuración Spring
public class ConfiguracionCors {

    /**
     * Lista de orígenes permitidos, cargada desde application.yml.
     * Si no se configura en el yml, usa los valores por defecto del frontend local.
     * Ejemplo en application.yml:
     *   quanta.cors.allowed-origins: http://localhost:5173,http://localhost:8081
     */
    @Value("${quanta.cors.allowed-origins:http://localhost:5173,http://localhost:8081,http://localhost:3000}")
    private List<String> origenesPermitidos;

    /**
     * Define las reglas CORS para todos los endpoints de la API.
     *
     * Spring Security consume este bean mediante .cors(Customizer.withDefaults())
     * en la cadena de filtros de seguridad, garantizando que CORS se evalúe
     * ANTES que cualquier verificación de autenticación.
     *
     * @return CorsConfigurationSource con las reglas aplicadas a todos los paths
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();

        // Orígenes permitidos — solo los frontends registrados pueden hacer peticiones
        configuracion.setAllowedOrigins(origenesPermitidos);

        // Métodos HTTP permitidos — incluye OPTIONS para pre-flight requests
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // Cabeceras HTTP permitidas — "*" acepta cualquier header (Authorization, Content-Type, etc.)
        configuracion.setAllowedHeaders(List.of("*"));

        // Permite enviar cookies y credenciales en las peticiones cross-origin
        configuracion.setAllowCredentials(true);

        // Tiempo en segundos que el navegador puede cachear la respuesta del pre-flight
        configuracion.setMaxAge(3600L);

        // Aplica la configuración CORS a TODAS las rutas del backend
        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", configuracion);
        return fuente;
    }
}
