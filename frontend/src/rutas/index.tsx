/**
 * Pagina de resumen principal ("/").
 *
 * Muestra tres secciones:
 *   1. Hero: titulo de la plataforma + mini portafolio de 9 activos con precios en tiempo real.
 *   2. KPIs: cuatro tarjetas con metricas globales del portafolio.
 *   3. Portafolio completo: grilla de los 20 activos con precio, retorno y volatilidad.
 *
 * Todos los calculos se realizan una sola vez con useMemo ya que los datos
 * son estaticos (generados por el PRNG en finance-data.ts).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { FileText } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { StatCard } from "@/componentes/panel/Primitives";
import { ASSETS, ASSET_MAP, returns, annualVol, fmt } from "@/lib/finance-data";

/** Definicion de la ruta raiz con metadatos para el <title> del documento */
export const Route = createFileRoute("/")({
  component: Resumen,
  head: () => ({
    meta: [
      { title: "Resumen · Quanta · Algorithmic Market Lab" },
      { name: "description", content: "Plataforma de analisis algoritmico de series financieras: BVC, ETFs e indices globales." },
    ],
  }),
});

function Resumen() {
  // Activo de referencia para el KPI de ultimo retorno (ECOPETROL es el activo principal BVC)
  const asset = ASSET_MAP["ECOPETROL"];

  /**
   * Calcula las metricas globales del portafolio una sola vez al montar.
   * - totalAssets: cantidad de activos en el dataset (20)
   * - totalRows: suma de todas las barras OHLCV (~26.000)
   * - avgVol: volatilidad anualizada promedio de los 20 activos
   * - lastR: ultimo retorno diario de ECOPETROL
   */
  const stats = useMemo(() => {
    const totalAssets = ASSETS.length;
    const totalRows   = ASSETS.reduce((s, a) => s + a.series.length, 0);
    const avgVol      = ASSETS.reduce((s, a) => s + annualVol(a.series), 0) / ASSETS.length;
    const r           = returns(asset.series);
    const lastR       = r[r.length - 1];
    return { totalAssets, totalRows, avgVol, lastR };
  }, []);

  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── Hero: titulo + indicador de sesion activa ── */}
        <section className="relative pt-6 pb-2">
          <div className="flex items-center gap-2 mb-4">
            {/* Punto verde pulsante: indica que los datos estan activos */}
            <div className="size-1.5 rounded-full bg-bull pulse-dot" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Sesion activa · BVC + NYSE ·{" "}
              {new Date().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
            {/* Titular principal */}
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[0.95]">
                Analisis algoritmico de
                <span className="block bg-gradient-to-r from-primary via-warning to-accent bg-clip-text text-transparent">
                  series financieras
                </span>
              </h1>
              <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
                ETL automatizado, metricas de similitud entre activos, deteccion de patrones por ventana
                deslizante, clasificacion de riesgo y dashboard bursatil — todo construido sobre algoritmos
                clasicos implementados de forma explicita, sin librerias de alto nivel.
              </p>
            </div>

            {/* Mini portafolio: los primeros 9 activos con precio y retorno */}
            <div className="surface-card p-5 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 size-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Portafolio · demo
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ASSETS.slice(0, 9).map(a => {
                  const r    = returns(a.series);
                  const last = r[r.length - 1]; // Ultimo retorno diario
                  return (
                    <div key={a.ticker} className="rounded-md border border-border bg-background/40 p-2">
                      <div className="text-[10px] font-mono text-muted-foreground">{a.ticker}</div>
                      <div className="text-xs font-mono">{fmt(a.series[a.series.length - 1].close)}</div>
                      <div className={`text-[10px] font-mono ${last >= 0 ? "text-bull" : "text-bear"}`}>
                        {last >= 0 ? "+" : ""}{(last * 100).toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── KPIs globales ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Activos en cartera"
            value={String(stats.totalAssets)}
            delta="BVC + ETFs globales"
            accent="primary"
          />
          <StatCard
            label="Observaciones OHLCV"
            value={stats.totalRows.toLocaleString()}
            delta="≈ 5 anos · diario"
            accent="accent"
          />
          <StatCard
            label="Volatilidad media (s)"
            value={`${(stats.avgVol * 100).toFixed(1)}%`}
            delta="anualizada"
          />
          <StatCard
            label="ECOPETROL · ultimo D"
            value={`${stats.lastR >= 0 ? "+" : ""}${(stats.lastR * 100).toFixed(2)}%`}
            delta={`Cierre ${fmt(asset.series[asset.series.length - 1].close)}`}
            accent={stats.lastR >= 0 ? "bull" : "bear"}
          />
        </section>

        {/* ── Portafolio completo: grilla de los 20 activos ── */}
        <section>
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Portafolio completo · {ASSETS.length} activos
          </h2>
          <div className="surface-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {ASSETS.map(a => {
                const r    = returns(a.series);
                const last  = r[r.length - 1];
                const vol   = annualVol(a.series); // Volatilidad anualizada individual
                return (
                  <div key={a.ticker} className="rounded-md border border-border bg-background/40 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-semibold">{a.ticker}</div>
                      <div className={`text-[10px] font-mono ${last >= 0 ? "text-bull" : "text-bear"}`}>
                        {last >= 0 ? "+" : ""}{(last * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{a.name}</div>
                    <div className="text-xs font-mono">{fmt(a.series[a.series.length - 1].close)}</div>
                    {/* Volatilidad anualizada de este activo */}
                    <div className="text-[10px] font-mono text-muted-foreground">s {(vol * 100).toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pie de seccion con estado del pipeline */}
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

      </main>
    </div>
  );
}
