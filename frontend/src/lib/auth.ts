/**
 * Capa de autenticación del cliente.
 *
 * Responsabilidades:
 *   - Persistir el JWT y los datos del usuario en localStorage.
 *   - Exponer helpers para leer / escribir / eliminar esos valores.
 *   - Realizar las llamadas HTTP a los endpoints /auth/login y /auth/register.
 *   - Descargar el reporte PDF desde el backend.
 *
 * Flujo típico:
 *   1. El usuario llena el formulario → se llama a apiLogin() o apiRegister().
 *   2. El servidor devuelve { token, user }.
 *   3. Se guarda el token con setToken() y el usuario con setUser().
 *   4. Cualquier componente puede comprobar isAuthenticated() o leer getUser().
 *   5. Al cerrar sesión se llama a removeToken(), que borra ambas claves.
 */

/** Clave de localStorage donde se guarda el JWT */
const TOKEN_KEY = 'quanta_token';
/** Clave de localStorage donde se serializa el objeto AuthUser */
const USER_KEY  = 'quanta_user';

/**
 * URL base del backend.
 * En desarrollo apunta a localhost:8080; en producción se inyecta
 * mediante la variable de entorno VITE_API_BASE_URL (definida en .env.production).
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

/** Información del usuario autenticado que devuelve el servidor tras el login */
export interface AuthUser {
  id:    string;  // UUID único del usuario en la base de datos
  name:  string;  // Nombre completo (ej. "Carlos Rodríguez")
  email: string;  // Email usado como identificador de login
}

// ── Helpers de persistencia ───────────────────────────────────────────────────

/** Lee el JWT almacenado. Retorna null si no hay sesión activa. */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Persiste el JWT recibido del servidor. */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Elimina el JWT y los datos del usuario — equivale a cerrar sesión. */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Lee el objeto de usuario guardado. Retorna null si no hay sesión. */
export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

/** Serializa y persiste el objeto de usuario en localStorage. */
export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Retorna true si existe un token activo en localStorage. */
export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── Llamadas a la API ─────────────────────────────────────────────────────────

/** Prefijo de los endpoints de autenticación */
const API = `${API_BASE}/auth`;

/** Estructura que devuelve el servidor en login y registro */
interface AuthResponse {
  token: string;   // JWT firmado con expiración configurable en el backend
  user:  AuthUser; // Datos básicos del usuario para mostrar en la UI
}

/**
 * Llama a POST /auth/login con las credenciales del usuario.
 * Lanza un Error con el mensaje del servidor si la respuesta no es 2xx.
 *
 * @param email    Correo registrado
 * @param password Contraseña en texto plano (el backend la compara con BCrypt)
 * @returns        Token JWT y datos del usuario
 */
export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Credenciales incorrectas');
  return data;
}

/**
 * Llama a POST /auth/register para crear una cuenta nueva.
 * Lanza un Error con el mensaje del servidor si el email ya existe u otro problema.
 *
 * @param name     Nombre completo del nuevo usuario
 * @param email    Correo (debe ser único en el sistema)
 * @param password Contraseña — el backend la hashea con BCrypt antes de guardar
 * @returns        Token JWT y datos del usuario recién creado
 */
export async function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Error al registrarse');
  return data;
}

/**
 * Descarga el reporte PDF técnico desde el backend (GET /export/report).
 * Requiere token JWT en el header Authorization para pasar el filtro Spring Security.
 * Retorna el Blob para que el componente pueda crear un enlace de descarga temporal.
 *
 * @throws Error si el servidor responde con código distinto de 2xx
 */
export async function descargarReportePdf(): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/export/report`, { headers });
  if (!res.ok) throw new Error('Error al generar el reporte PDF: ' + res.status);
  return res.blob();
}
