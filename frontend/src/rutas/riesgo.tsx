import { createFileRoute } from "@tanstack/react-router";
import { Waves, Cpu, FileText } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { RiskTable } from "@/componentes/panel/RiskTable";

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
          title="Volatilidad, riesgo y detección de patrones"
          hint="Sliding window · σ anualizada · clasificación Conservador / Moderado / Agresivo"
        />
        <RiskTable />
        <ArquitecturaGrid />
        <Footer />
      </main>
    </div>
  );
}

const TECH = [
  { k: "Frontend",          v: "TanStack Start · React 19 · Tailwind CSS v4" },
  { k: "Algoritmos",        v: "TypeScript puro · sin librerías de alto nivel" },
  { k: "ETL",               v: "Java 21 · HttpClient nativo · Yahoo Finance API" },
  { k: "Backend",           v: "Spring Boot 3.3.6 · JWT · BCrypt" },
  { k: "Visualización",     v: "SVG nativo · candlestick · heatmap" },
  { k: "Reporte PDF",       v: "OpenPDF generado on-demand en el servidor" },
  { k: "Despliegue",        v: "Docker Compose · backend:8080 · frontend:5173" },
  { k: "Reproducibilidad",  v: "PRNG mulberry32 · semilla única por activo" },
];

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
                i % 4 !== 3 ? "lg:border-r" : "",
                i % 2 === 0 ? "sm:border-r" : "",
                i < 4 ? "border-b" : "",
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

function Footer() {
  return (
    <footer className="pt-8 pb-12 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="size-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">
            Proyecto académico · Análisis Algorítmico Financiero · Datos sintéticos para demo de UI
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
