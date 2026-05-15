import { useState } from "react";
import {
  apiLogin, apiRegister,
  setToken, setUser,
  type AuthUser,
} from "@/lib/auth";

interface Props {
  onSuccess: (user: AuthUser) => void;
}

type Tab = "login" | "register";

export function LoginPage({ onSuccess }: Props) {
  const [tab, setTab]                       = useState<Tab>("login");
  const [name, setName]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirm]       = useState("");
  const [error, setError]                   = useState("");
  const [loading, setLoading]               = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email, password);
      setToken(token);
      setUser(user);
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
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

  const inputCls =
    "w-full px-3 py-2.5 text-sm font-mono bg-input border border-border rounded-md " +
    "text-foreground placeholder:text-muted-foreground " +
    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">

      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.28 0.02 250) 1px, transparent 1px)," +
            "linear-gradient(90deg, oklch(0.28 0.02 250) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[420px]">

        {/* ── Logo ── */}
        <div className="text-center mb-8">
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
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="size-1.5 rounded-full bg-bull pulse-dot" />
            <span className="text-[10px] font-mono text-muted-foreground">Mercados · BVC · NYSE · NASDAQ</span>
          </div>
        </div>

        {/* ── Card ── */}
        <div className="surface-card p-8 rounded-xl"
             style={{ boxShadow: "0 24px 64px oklch(0 0 0 / 0.5)" }}>

          {/* Tabs */}
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

          {/* ── Login Form ── */}
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

          {/* ── Register Form ── */}
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

        <p className="text-center text-[10px] font-mono text-muted-foreground mt-6 tracking-widest">
          QUANTA LTDA · {new Date().getFullYear()} · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

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

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
      <span className="text-destructive text-[11px] font-mono">{msg}</span>
    </div>
  );
}

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
