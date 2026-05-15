const TOKEN_KEY = 'quanta_token';
const USER_KEY  = 'quanta_user';

export const API_BASE = 'http://localhost:8080/api/v1';

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── API calls ─────────────────────────────────────────────────────────────────

const API = `${API_BASE}/auth`;

interface AuthResponse {
  token: string;
  user:  AuthUser;
}

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
 * Descarga el reporte PDF técnico desde el backend.
 * Retorna el Blob para que el componente pueda crear el enlace de descarga.
 */
export async function descargarReportePdf(): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/export/report`, { headers });
  if (!res.ok) throw new Error('Error al generar el reporte PDF: ' + res.status);
  return res.blob();
}
