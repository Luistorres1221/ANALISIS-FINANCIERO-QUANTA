package com.quanta.analisis.configuracion;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuración de la documentación interactiva OpenAPI / Swagger UI.
 *
 * SpringDoc genera automáticamente la documentación de todos los endpoints REST
 * a partir de las anotaciones @RestController, @GetMapping, @Operation, etc.
 * Esta clase personaliza los metadatos (título, versión, descripción, contacto)
 * y los servidores disponibles.
 *
 * La documentación estará disponible en:
 *   - Swagger UI: http://localhost:8080/swagger-ui.html
 *   - JSON bruto:  http://localhost:8080/api-docs
 */
@Configuration // Indica que esta clase provee beans de configuración a Spring
public class ConfiguracionOpenApi {

    /**
     * Define la personalización del objeto OpenAPI principal.
     * Spring registra este bean y SpringDoc lo usa para enriquecer la documentación.
     *
     * @return Objeto OpenAPI con metadatos del proyecto y lista de servidores
     */
    @Bean
    OpenAPI apiOpenApiQuanta() {
        return new OpenAPI()
                // ── Información general de la API ──────────────────────────────────────
                .info(new Info()
                        .title("Quanta · Algorithmic Market Lab API")   // Título que aparece en Swagger UI
                        .version("1.0.0")                               // Versión de la API
                        .description("""
                                REST API para análisis algorítmico de series temporales financieras.

                                **Funcionalidades:**
                                - ETL pipeline de datos OHLCV (20 activos, ~5 años)
                                - Similitud temporal: Pearson, Coseno, Euclidiana, DTW
                                - Volatilidad anualizada, CAGR, categorización de riesgo
                                - Detección de patrones: rachas alcistas, formas V
                                - Matriz de correlación 20×20
                                """)
                        // Información de contacto del equipo de desarrollo
                        .contact(new Contact()
                                .name("Quanta · Algorithmic Market Lab")
                                .email("info@quanta.analisis.com")))

                // ── Lista de servidores donde está desplegada la API ────────────────────
                .servers(List.of(
                        // Servidor de desarrollo local
                        new Server().url("http://localhost:8080").description("Desarrollo local"),
                        // Servidor de producción (URL referencial)
                        new Server().url("https://api.quanta.analisis.com").description("Producción")
                ));
    }
}
