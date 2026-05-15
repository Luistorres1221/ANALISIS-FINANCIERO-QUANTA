/**
 * Pagina de volatilidad, riesgo y patrones ("/riesgo") — REQ 03.
 *
 * Contiene tres secciones:
 *   1. RiskTable: tabla ordenable con metricas de riesgo de los 20 activos.
 *      - Desviacion estandar diaria (s)
 *      - Volatilidad anualizada (s * sqrt(252))
 *      - Categoria: Conservador / Moderado / Agresivo
 *      - Patrones: rachas alcistas/bajistas de 3 dias y ventanas de alta volatilidad
 *   2. ArquitecturaGrid: resumen tecnico de la pila de tecnologias usadas.
 *   3. Footer: nota academica y estado del pipeline.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Waves, Cpu, FileText } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { RiskTable } from "@/componentes/panel/RiskTable";

/** Definicion de la ruta con titulo de pestaña */
export const Route = createFileRoute("/riesgo")({
  component: RiesgoPage,
  head: () => ({ meta: [{ title: "Riesgo · Quanta" }] }),
});

function RiesgoPage() {
  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">
        <SectionTitle
          icon={Waves}
          num="03"
          title="Volatilidad, riesgo y deteccion de patrones"
          hint="Sliding window · s anualizada · clasificacion Conservador / Moderado / Agresivo"
        />
        {/* Tabla principal con metricas de riesgo y patrones de los 20 activos */}
        <RiskTable />
        {/* Resumen de la arquitectura tecnica del proyecto */}
        <ArquitecturaGrid />
        <Footer />
      </main>
    </div>
  );
}

/**
 * Datos de la pila tecnologica para mostrar en la grilla de arquitectura.
 * Cada entrada describe una capa del sistema con su tecnologia principal.
 */
const TECH = [
  { k: "Frontend",          v: "TanStack Start · React 19 · Tailwind CSS v4" },
  { k: "Algoritmos",        v: "TypeScript puro · sin librerias de alto nivel" },
  { k: "ETL",               v: "Java 21 · HttpClient nativo · Yahoo Finance API" },
  { k: "Backend",           v: "Spring Boot 3.3.6 · JWT · BCrypt" },
  { k: "Visualizacion",     v: "SVG nativo · candlestick · heatmap" },
  { k: "Reporte PDF",       v: "OpenPDF generado on-demand en el servidor" },
  { k: "Despliegue",        v: "Docker Compose · backend:8080 · frontend:5173" },
  { k: "Reproducibilidad",  v: "PRNG mulberry32 · semilla unica por activo" },
];

/**
 * Grilla que muestra las 8 capas de la arquitectura del proyecto.
 * Usa bordes CSS condicionales para crear una tabla visual sin <table>.
 */
function ArquitecturaGrid() {
  return (
    <section>
      <SectionTitle icon={Cpu} num="05" title="Arquitectura y despliegue" />
      <div className="surface-card p-2">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {TECH.map((t, i) => (
            <div
              key={t.k}
              className={[
                "p-4 border-border",
                i % 4 !== 3 ? "lg:border-r" : "",  // Borde derecho excepto ultima columna
                i % 2 === 0 ? "sm:border-r" : "",   // Borde derecho en pares (sm)
                i < 4 ? "border-b" : "",             // Borde inferior en la primera fila
              ].join(" ")}
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{t.k}</div>
              <div className="mt-1.5 text-sm">{t.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Pie de pagina con nota academica e indicador de estado del pipeline ETL */
function Footer() {
  return (
    <footer className="pt-8 pb-12 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">
            Proyecto academico · Analisis Algoritmico Financiero · Datos sinteticos para demo de UI
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-bull pulse-dot" />
            Pipeline OK
          </span>
          <span>Build · v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
