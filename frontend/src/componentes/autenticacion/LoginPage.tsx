/**
 * Página de autenticación — Login y Registro.
 *
 * Presenta una pantalla centrada con fondo oscuro y efecto de cuadrícula CSS.
 * Tiene dos modos (tabs):
 *   - "login": formulario con email + contraseña → llama a apiLogin()
 *   - "register": formulario con nombre + email + contraseña + confirmación → llama a apiRegister()
 *
 * En ambos casos, si el servidor responde OK:
 *   1. Se almacena el JWT con setToken()
 *   2. Se almacena el usuario con setUser()
 *   3. Se invoca onSuccess(user) para que el padre actualice el contexto de autenticación
 *
 * Si hay error (red, credenciales inválidas, email duplicado), se muestra
 * un banner rojo con el mensaje del servidor.
 */
import { useState } from "react";
import {
  apiLogin, apiRegister,
  setToken, setUser,
  type AuthUser,
} from "@/lib/auth";

/** Callback que recibe el componente raíz para actualizar el estado de sesión */
interface Props {
  onSuccess: (user: AuthUser) => void;
}

/** Modo activo del formulario */
type Tab = "login" | "register";

export function LoginPage({ onSuccess }: Props) {
  // Estado del formulario
  const [tab, setTab]                       = useState<Tab>("login");
  const [name, setName]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirm]       = useState("");
  const [error, setError]                   = useState("");   // Mensaje de error visible
  const [loading, setLoading]               = useState(false); // Deshabilita botón mientras carga

  /** Cambia de tab y limpia el error para que no quede visible al cambiar de modo */
  function switchTab(t: Tab) {
    setTab(t);
    setError("");
  }

  /**
   * Maneja el envío del formulario de login.
   * Previene la recarga por defecto del form, luego llama al backend.
   */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      setToken(token); // Guarda JWT en localStorage
      setUser(user);   // Guarda datos del usuario en localStorage
      onSuccess(user); // Notifica al componente raíz para redirigir al dashboard
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Maneja el envío del formulario de registro.
   * Valida localmente que las contraseñas coincidan antes de llamar al backend.
   */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    // Validaciones del lado cliente para evitar llamadas innecesarias al servidor
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6)          { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setError("");
    setLoading(true);
    try {
      const { token, user } = await apiRegister(name, email, password);
      setToken(token);
      setUser(user);
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  /** Clases CSS compartidas por todos los campos del formulario */
  const inputCls =
    "w-full px-3 py-2.5 text-sm font-mono bg-input border border-border rounded-md " +
    "text-foreground placeholder:text-muted-foreground " +
    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">

      {/* ── Fondo decorativo: cuadrícula sutil ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.28 0.02 250) 1px, transparent 1px)," +
            "linear-gradient(90deg, oklch(0.28 0.02 250) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Blobs de brillo desenfocado (efecto glassmorphism) ── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[420px]">

        {/* ── Logo y marca ── */}
        <div className="text-center mb-8">
          {/* Ícono "Q" con gradiente naranja-azul */}
          <div className="inline-flex items-center justify-center size-16 rounded-2xl mb-4"
               style={{ background: "linear-gradient(135deg, oklch(0.78 0.17 75), oklch(0.62 0.17 235))",
                        boxShadow: "0 0 32px oklch(0.78 0.17 75 / 0.35)" }}>
            <span className="text-2xl font-bold font-mono" style={{ color: "oklch(0.16 0.015 250)" }}>Q</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-foreground">
            QUANTA <span className="text-primary">LTDA</span>
          </h1>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-accent mt-1.5">
            Mercado Algoritmico
          </p>
          {/* Indicador de estado activo (verde pulsante) */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="size-1.5 rounded-full bg-bull pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground">Mercados · BVC · NYSE · NASDAQ</span>
          </div>
        </div>

        {/* ── Tarjeta del formulario ── */}
        <div className="surface-card p-8 rounded-xl"
             style={{ boxShadow: "0 24px 64px oklch(0 0 0 / 0.5)" }}>

          {/* Selector de tabs: Iniciar Sesión / Registrarse */}
          <div className="flex rounded-md bg-secondary p-1 mb-7">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-[11px] font-mono uppercase tracking-widest rounded-sm transition-all ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Iniciar Sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          {/* ── Formulario de login ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                       placeholder="usuario@quanta.com" required className={inputCls} />
              </Field>
              <Field label="Contraseña">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                       placeholder="••••••••" required className={inputCls} />
              </Field>
              {error && <ErrorMsg msg={error} />}
              <SubmitBtn loading={loading} label="Iniciar Sesión" loadingLabel="Verificando..." />
            </form>
          )}

          {/* ── Formulario de registro ── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Nombre completo">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                       placeholder="Carlos Rodríguez" required className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                       placeholder="usuario@quanta.com" required className={inputCls} />
              </Field>
              <Field label="Contraseña">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                       placeholder="Mínimo 6 caracteres" required className={inputCls} />
              </Field>
              <Field label="Confirmar contraseña">
                <input type="password" value={confirmPassword} onChange={e => setConfirm(e.target.value)}
                       placeholder="••••••••" required className={inputCls} />
              </Field>
              {error && <ErrorMsg msg={error} />}
              <SubmitBtn loading={loading} label="Crear cuenta" loadingLabel="Creando cuenta..." />
            </form>
          )}
        </div>

        {/* Pie legal mínimo */}
        <p className="text-center text-[10px] font-mono text-muted-foreground mt-6 tracking-widest">
          QUANTA LTDA · {new Date().getFullYear()} · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

/**
 * Contenedor de campo de formulario con etiqueta superior.
 * Acepta cualquier input/select como children.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Banner de error rojo que muestra el mensaje recibido del servidor.
 * Solo se renderiza cuando hay un error activo.
 */
function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
      <span className="text-destructive text-[11px] font-mono">{msg}</span>
    </div>
  );
}

/**
 * Botón de envío del formulario con estado de carga.
 * Se deshabilita y muestra el texto alternativo mientras loading === true.
 *
 * @param loading      true = petición en curso (deshabilita el botón)
 * @param label        Texto normal del botón
 * @param loadingLabel Texto mientras se espera la respuesta del servidor
 */
function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 text-sm font-mono font-semibold rounded-md transition-opacity
                 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "linear-gradient(135deg, oklch(0.78 0.17 75), oklch(0.70 0.17 65))",
               color: "oklch(0.16 0.015 250)" }}
    >
      {loading ? loadingLabel : `${label} →`}
    </button>
  );
}
