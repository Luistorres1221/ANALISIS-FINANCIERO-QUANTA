/**
 * Cabecera global de la aplicacion autenticada.
 *
 * Renderiza dos capas:
 *   1. La barra de navegacion fija (sticky) con logo, menu de paginas y acciones.
 *   2. El componente Ticker (banda de cotizaciones animada) inmediatamente debajo.
 *
 * Funcionalidades del header:
 *   - Logo: enlace a la pagina de resumen ("/")
 *   - Navegacion: 6 secciones de la app, con resaltado del item activo
 *   - Boton "Reporte PDF": descarga el informe generado por el backend
 *   - Chip con nombre del usuario autenticado
 *   - Boton "Salir": cierra la sesion via logout() del contexto de auth
 *
 * El boton PDF llama a descargarReportePdf(), que hace GET /api/v1/export/report
 * con el JWT en el header Authorization. El blob resultante se descarga via
 * un enlace temporal creado con URL.createObjectURL().
 */
import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Download, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { descargarReportePdf } from "@/lib/auth";
import { Ticker } from "./Primitives";

/** Items del menu de navegacion principal */
const NAV_ITEMS = [
  { label: "Resumen",       to: "/"             },
  { label: "ETL",           to: "/etl"          },
  { label: "Graficos",      to: "/graficos"     },
  { label: "Similitud",     to: "/similitud"    },
  { label: "Riesgo",        to: "/riesgo"       },
  { label: "Ordenamiento",  to: "/ordenamiento" },
] as const;

export function AppHeader() {
  const { user, logout } = useAuth(); // Contexto global de autenticacion
  const { pathname } = useLocation(); // Ruta activa para resaltar el item del menu
  const [pdfCargando, setPdfCargando] = React.useState(false); // Evita doble clic

  /**
   * Descarga el reporte PDF del backend.
   * Crea un enlace <a> temporal en el DOM, simula un clic y lo elimina.
   * URL.revokeObjectURL libera memoria del blob una vez descargado.
   */
  const handleDescargarPdf = async () => {
    if (pdfCargando) return; // Ignora clic si ya hay una descarga en curso
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
      URL.revokeObjectURL(url); // Libera la URL del blob de memoria
    } catch (err) {
      console.error("Error al descargar PDF:", err);
    } finally {
      setPdfCargando(false);
    }
  };

  return (
    <>
      {/* ── Barra de navegacion fija en la parte superior ── */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Logo: gradiente Q + nombre de la empresa */}
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

          {/* Menu de navegacion — oculto en movil, visible en md+ */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-mono">
            {NAV_ITEMS.map(({ label, to }) => {
              // El item raiz "/" solo esta activo en la ruta exacta "/"
              const active = to === "/" ? pathname === "/" : pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-sm transition-colors ${
                    active
                      ? "text-foreground bg-primary/10 border border-primary/30" // Item activo
                      : "text-muted-foreground hover:text-foreground"             // Items inactivos
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Acciones del lado derecho */}
          <div className="flex items-center gap-2">

            {/* Boton de descarga PDF — oculto en movil */}
            <button
              onClick={handleDescargarPdf}
              disabled={pdfCargando}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="size-3.5" />
              {pdfCargando ? "Generando..." : "Reporte PDF"}
            </button>

            {/* Chip con nombre del usuario autenticado — oculto en movil */}
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-border text-xs font-mono text-muted-foreground">
                <User className="size-3.5" />
                <span className="max-w-[120px] truncate">{user.name}</span>
              </div>
            )}

            {/* Boton de cierre de sesion */}
            <button
              onClick={logout}
              title="Cerrar sesion"
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border border-border hover:border-destructive/60 hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Banda de cotizaciones animada debajo del header */}
      <Ticker />
    </>
  );
}
