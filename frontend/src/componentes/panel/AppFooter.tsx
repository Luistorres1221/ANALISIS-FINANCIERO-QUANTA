import { Github, Mail, Users } from "lucide-react";

const AÑO = new Date().getFullYear();

const NAV_FOOTER = [
  { label: "Resumen",      href: "/"             },
  { label: "ETL",          href: "/etl"          },
  { label: "Gráficos",     href: "/graficos"     },
  { label: "Similitud",    href: "/similitud"    },
  { label: "Riesgo",       href: "/riesgo"       },
  { label: "Ordenamiento", href: "/ordenamiento" },
];

const AUTORES = [
  "Luis Alberto Torres",
  "Jhon Stivenson Méndez",
  "Robinson Gañan",
];

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-background/60 backdrop-blur">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">

        {/* Fila superior: 3 columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* Columna 1 — Marca */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center font-mono font-bold text-primary-foreground text-sm">
                Q
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">QUANTA LTDA</div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground -mt-0.5">
                  Mercado Algoritmico
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
              Plataforma de análisis algorítmico de series financieras: BVC,
              NYSE, ETFs e índices globales. Datos en tiempo real vía Yahoo Finance.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/Luistorres1221/ANALISIS-FINANCIERO-QUANTA"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="size-3.5" />
                GitHub
              </a>
              <span className="text-border">·</span>
              <a
                href="mailto:pruebapruebatorres@gmail.com"
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="size-3.5" />
                Contacto
              </a>
            </div>
          </div>

          {/* Columna 2 — Navegación */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-3">
              Páginas
            </div>
            <ul className="space-y-1.5">
              {NAV_FOOTER.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Equipo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-3 text-muted-foreground/60" />
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                Integrantes
              </div>
            </div>
            <ul className="space-y-2">
              {AUTORES.map((nombre) => (
                <li key={nombre} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary/50 shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">{nombre}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Fila inferior — copyright */}
        <div className="pt-5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-muted-foreground/60">
          <span>
            © {AÑO === 2026 ? "2026" : `2026–${AÑO}`}{" "}
            <span className="text-muted-foreground">QUANTA LTDA</span>{" "}
            · Todos los derechos reservados.
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>React 19 · Spring Boot 3 · Java 21</span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="text-primary/70">v1.0.0</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
