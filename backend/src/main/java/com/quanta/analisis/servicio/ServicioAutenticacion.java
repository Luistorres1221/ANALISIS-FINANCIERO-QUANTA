package com.quanta.analisis.servicio;

import com.quanta.analisis.dominio.modelo.Usuario;
import com.quanta.analisis.dto.autenticacion.RespuestaAutenticacion;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio de autenticación de usuarios: registro, login y generación de tokens JWT.
 *
 * Implementa un almacenamiento en memoria (ConcurrentHashMap) en lugar de base de datos,
 * apropiado para este sistema de demostración. Los datos se pierden al reiniciar el servidor,
 * excepto el usuario demo que se recrea automáticamente en cada arranque.
 *
 * Flujo de registro:
 *   1. Verifica que el email no esté ya registrado
 *   2. Hashea la contraseña con BCrypt (nunca se guarda en texto plano)
 *   3. Crea el objeto Usuario con un UUID único
 *   4. Lo almacena en el mapa en memoria
 *   5. Genera y retorna un token JWT
 *
 * Flujo de login:
 *   1. Busca el usuario por email (ignorando mayúsculas)
 *   2. Verifica la contraseña comparando el texto plano con el hash BCrypt
 *   3. Si coincide, genera y retorna un token JWT
 *
 * ConcurrentHashMap es thread-safe: permite accesos concurrentes desde múltiples
 * peticiones HTTP simultáneas sin condiciones de carrera.
 *
 * @Slf4j genera el campo 'log' para registrar eventos de autenticación.
 * @Service y @RequiredArgsConstructor: Spring inyecta ServicioJwt y PasswordEncoder.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServicioAutenticacion {

    /** Servicio JWT para generar tokens tras autenticación exitosa */
    private final ServicioJwt      servicioJwt;

    /** Codificador BCrypt para hashear y verificar contraseñas */
    private final PasswordEncoder  codificador;

    /**
     * Almacén en memoria de todos los usuarios registrados.
     * ConcurrentHashMap es thread-safe para accesos concurrentes.
     * Clave: ID UUID del usuario, Valor: objeto Usuario completo
     */
    private final Map<String, Usuario> mapaUsuarios = new ConcurrentHashMap<>();

    /**
     * Crea el usuario demo al arrancar el servidor.
     *
     * @PostConstruct garantiza que se ejecute después de inyectar las dependencias.
     * El usuario demo permite probar el sistema sin necesidad de registrarse:
     *   Email:      admin@quanta.com
     *   Contraseña: quanta123
     *
     * La contraseña se hashea con BCrypt para simular el comportamiento real.
     */
    @PostConstruct
    void crearUsuarioDemo() {
        Usuario admin = Usuario.builder()
                .id(UUID.randomUUID().toString())          // Genera un UUID único
                .nombre("Admin Quanta")                    // Nombre del usuario demo
                .email("admin@quanta.com")                 // Email de acceso
                .hashContrasena(codificador.encode("quanta123"))  // Hash BCrypt de la contraseña
                .build();

        // Almacena el usuario demo en el mapa con su ID como clave
        mapaUsuarios.put(admin.getId(), admin);
        log.info("Usuario demo creado: admin@quanta.com / quanta123");
    }

    /**
     * Autentica un usuario con email y contraseña.
     *
     * @param email     Correo electrónico del usuario (insensible a mayúsculas)
     * @param contrasena Contraseña en texto plano enviada por el cliente
     * @return RespuestaAutenticacion con el token JWT y los datos del usuario
     * @throws IllegalArgumentException Si el email no existe o la contraseña es incorrecta
     *         (mensaje genérico para no revelar si el email existe)
     */
    public RespuestaAutenticacion iniciarSesion(String email, String contrasena) {
        // Busca el usuario por email, ignorando mayúsculas/minúsculas
        Usuario usuario = mapaUsuarios.values().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Credenciales incorrectas"));

        // Compara la contraseña enviada con el hash BCrypt almacenado
        // BCrypt.matches() es deliberadamente lento para resistir fuerza bruta
        if (!codificador.matches(contrasena, usuario.getHashContrasena())) {
            // Lanza el mismo mensaje que si el email no existe (no revelar información)
            throw new IllegalArgumentException("Credenciales incorrectas");
        }

        // Credenciales válidas: genera el token JWT y construye la respuesta
        return construirRespuesta(usuario);
    }

    /**
     * Registra un nuevo usuario en el sistema.
     *
     * @param nombre     Nombre completo del nuevo usuario
     * @param email      Correo electrónico — debe ser único en el sistema
     * @param contrasena Contraseña deseada (mínimo 6 caracteres, validado en el DTO)
     * @return RespuestaAutenticacion con el token JWT y los datos del nuevo usuario
     * @throws IllegalArgumentException Si el email ya está registrado
     */
    public RespuestaAutenticacion registrarUsuario(String nombre, String email, String contrasena) {
        // Verifica que no exista otro usuario con el mismo email
        boolean emailExistente = mapaUsuarios.values().stream()
                .anyMatch(u -> u.getEmail().equalsIgnoreCase(email));
        if (emailExistente) {
            throw new IllegalArgumentException("El email ya está registrado");
        }

        // Crea el nuevo usuario con contraseña hasheada
        Usuario nuevoUsuario = Usuario.builder()
                .id(UUID.randomUUID().toString())           // UUID único generado automáticamente
                .nombre(nombre)                             // Nombre completo
                .email(email)                              // Email (ya verificado que no existe)
                .hashContrasena(codificador.encode(contrasena))  // Nunca se guarda la contraseña en texto plano
                .build();

        // Almacena el nuevo usuario en memoria
        mapaUsuarios.put(nuevoUsuario.getId(), nuevoUsuario);
        log.info("Nuevo usuario registrado exitosamente: {}", email);

        // Retorna el token JWT para que el usuario quede logueado inmediatamente
        return construirRespuesta(nuevoUsuario);
    }

    /**
     * Construye la respuesta de autenticación con el token JWT y la info del usuario.
     *
     * Método privado de ayuda para evitar duplicar la lógica de respuesta
     * entre iniciarSesion() y registrarUsuario().
     *
     * @param usuario Usuario autenticado o recién registrado
     * @return RespuestaAutenticacion lista para enviar al cliente
     */
    private RespuestaAutenticacion construirRespuesta(Usuario usuario) {
        return RespuestaAutenticacion.builder()
                .token(servicioJwt.generarToken(usuario))           // Token JWT firmado
                .user(RespuestaAutenticacion.InfoUsuario.desde(usuario))  // Info pública del usuario
                .build();
    }
}
