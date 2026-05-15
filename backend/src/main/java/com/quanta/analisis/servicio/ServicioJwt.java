package com.quanta.analisis.servicio;

import com.quanta.analisis.dominio.modelo.Usuario;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Servicio de generación y validación de tokens JWT (JSON Web Token).
 *
 * JWT es un estándar abierto (RFC 7519) para transmitir información de forma segura
 * entre dos partes como un objeto JSON compacto y autocontenido. Cada token tiene
 * tres partes: Header.Payload.Signature, codificadas en Base64URL.
 *
 * Este servicio usa el algoritmo HS256 (HMAC-SHA256) para firmar los tokens:
 *   - HMAC: Hash-based Message Authentication Code (autenticación por hash)
 *   - SHA-256: función hash que produce una firma de 256 bits
 *
 * La clave de firma debe tener al menos 256 bits (32 bytes) para HS256.
 * Se carga desde application.yml para no estar hardcodeada en el código fuente.
 *
 * Librería usada: JJWT 0.12.6 (io.jsonwebtoken) — el estándar de facto en Java.
 *
 * @Service registra esta clase como servicio Spring para inyección de dependencias.
 */
@Service
public class ServicioJwt {

    /**
     * Secreto para firmar los tokens JWT.
     * Se carga desde la propiedad 'quanta.jwt.secret' en application.yml.
     * Si no existe en la configuración, usa el valor por defecto.
     */
    @Value("${quanta.jwt.secret:QuantaLtdaAlgorithmicMarketLabSecretKey2024!XYZ#}")
    private String secreto;

    /**
     * Tiempo de expiración del token en milisegundos.
     * Por defecto: 86400000 ms = 86400 s = 1440 min = 24 horas.
     * Se carga desde 'quanta.jwt.expiration' en application.yml.
     */
    @Value("${quanta.jwt.expiration:86400000}")
    private long duracionMs;

    /**
     * Construye la clave criptográfica HMAC-SHA256 a partir del secreto.
     *
     * Convierte el String del secreto a bytes UTF-8 y los envuelve en una
     * SecretKey compatible con HS256. Esta clave se usa tanto para firmar
     * (en generarToken) como para verificar (en validarToken).
     *
     * @return SecretKey lista para usar con JJWT en operaciones de firma/verificación
     */
    private SecretKey claveSecreta() {
        // Convierte el string secreto a bytes usando UTF-8 (mismo encoding en todos los SO)
        byte[] bytesSecrero = secreto.getBytes(StandardCharsets.UTF_8);
        // Crea una clave HMAC-SHA para usar con JJWT
        return Keys.hmacShaKeyFor(bytesSecrero);
    }

    /**
     * Genera un token JWT firmado para un usuario autenticado.
     *
     * El token generado contiene los siguientes claims (datos):
     *   - subject: ID único del usuario (UUID)
     *   - email: correo electrónico del usuario
     *   - name: nombre completo del usuario
     *   - issuedAt: fecha/hora de emisión del token
     *   - expiration: fecha/hora de expiración (issuedAt + duracionMs)
     *
     * El token se firma con la clave HMAC-SHA256, garantizando que
     * cualquier modificación del payload invalida la firma.
     *
     * @param usuario Usuario autenticado cuyos datos se incluyen en el token
     * @return Token JWT como String (formato: "eyJhbGciOiJIUzI1NiJ9.xxx.yyy")
     */
    public String generarToken(Usuario usuario) {
        return Jwts.builder()
                .subject(usuario.getId())              // Subject = ID único del usuario
                .claim("email", usuario.getEmail())    // Claim personalizado: email
                .claim("name", usuario.getNombre())    // Claim personalizado: nombre
                .issuedAt(new Date())                  // Fecha de emisión = ahora
                .expiration(new Date(               // Fecha de expiración = ahora + 24 horas
                        System.currentTimeMillis() + duracionMs))
                .signWith(claveSecreta())             // Firma con HMAC-SHA256
                .compact();                            // Serializa a String Base64URL
    }

    /**
     * Valida si un token JWT es auténtico y no ha expirado.
     *
     * El parser de JJWT verifica automáticamente:
     *   1. Que la firma sea válida (no fue alterado)
     *   2. Que no haya expirado (fecha actual < expiration)
     *   3. Que el formato sea correcto (tres partes separadas por puntos)
     *
     * Si cualquiera de estas verificaciones falla, JJWT lanza una JwtException
     * que capturamos y convertimos en un simple boolean false.
     *
     * @param token Token JWT a validar (puede ser null o vacío)
     * @return true si el token es válido y vigente, false en cualquier otro caso
     */
    public boolean validarToken(String token) {
        try {
            // Intenta parsear y verificar el token — lanza excepción si es inválido
            Jwts.parser()
                    .verifyWith(claveSecreta())  // Configura la clave de verificación
                    .build()
                    .parseSignedClaims(token);   // Parsea y verifica la firma y expiración
            return true;  // Sin excepción = token válido y vigente
        } catch (JwtException | IllegalArgumentException e) {
            // JwtException: firma inválida, token expirado, formato incorrecto
            // IllegalArgumentException: token null o vacío
            return false;
        }
    }
}
