package com.quanta.analisis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada principal de la aplicación Spring Boot de Quanta.
 *
 * @SpringBootApplication es una anotación compuesta que activa tres configuraciones:
 *   - @Configuration: marca la clase como fuente de definiciones de beans
 *   - @EnableAutoConfiguration: activa la configuración automática de Spring Boot
 *     (detecta las dependencias en el classpath y configura Spring automáticamente)
 *   - @ComponentScan: escanea el paquete actual y subpaquetes buscando componentes
 *     (@Service, @Repository, @Controller, @Component, @Configuration)
 *
 * Al ejecutar el método main(), Spring Boot:
 *   1. Carga todas las clases anotadas con @Service, @Controller, @Component, etc.
 *   2. Inyecta automáticamente las dependencias entre clases (@Autowired / constructor)
 *   3. Ejecuta los métodos marcados con @PostConstruct (p.ej. el ETL en ServicioActivos)
 *   4. Inicia el servidor web embebido Tomcat en el puerto 8080
 *   5. Comienza a aceptar peticiones HTTP REST
 *
 * Comando para ejecutar el backend:
 *   mvn spring-boot:run -DskipTests
 */
@SpringBootApplication
public class AplicacionQuanta {

    /**
     * Método principal de Java — punto de arranque de la JVM.
     * Delega completamente el control a Spring Boot.
     *
     * @param args Argumentos de línea de comandos (p.ej. --server.port=9090)
     */
    public static void main(String[] args) {
        // SpringApplication.run() inicia todo el contexto de Spring Boot
        // AplicacionQuanta.class indica el paquete raíz para el escaneo de componentes
        SpringApplication.run(AplicacionQuanta.class, args);
    }
}
