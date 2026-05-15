import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Download, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { descargarReportePdf } from "@/lib/auth";
import { Ticker } from "./Primitives";

const NAV_ITEMS = [
  { label: "Resumen",       to: "/"             },
  { label: "ETL",           to: "/etl"          },
  { label: "Gráficos",      to: "/graficos"     },
  { label: "Similitud",     to: "/similitud"    },
  { label: "Riesgo",        to: "/riesgo"       },
  { label: "Ordenamiento",  to: "/ordenamiento" },
] as const;

export function AppHeader() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [pdfCargando, setPdfCargando] = React.useState(false);

  const handleDescargarPdf = async () => {
    if (pdfCargando) return;
    setPdfCargando(true);
    try {
      const blob = await descargarReportePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quanta-reporte-financiero.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    } finally {
      setPdfCargando(false);
    }
  };

  return (
    <>
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="size-8 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center font-mono font-bold text-primary-foreground">
              Q
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">QUANTA LTDA</div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground -mt-0.5">
                Mercado Algoritmico
              </div>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-mono">
            {NAV_ITEMS.map(({ label, to }) => {
              const active = to === "/" ? pathname === "/" : pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-sm transition-colors ${
                    active
                      ? "text-foreground bg-primary/10 border border-primary/30"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargarPdf}
              disabled={pdfCargando}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="size-3.5" />
              {pdfCargando ? "Generando..." : "Reporte PDF"}
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-border text-xs font-mono text-muted-foreground">
                <User className="size-3.5" />
                <span className="max-w-[120px] truncate">{user.name}</span>
              </div>
            )}

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border border-border hover:border-destructive/60 hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <Ticker />
    </>
  );
}
