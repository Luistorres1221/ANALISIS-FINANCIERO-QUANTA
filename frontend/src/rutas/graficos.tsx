/**
 * Pagina de graficos ("/graficos") — REQ 04.
 *
 * Contiene dos visualizaciones principales:
 *   1. Grafico de velas japonesas con SMA-20 y SMA-50.
 *      - El usuario elige el activo mediante botones en la barra de seleccion.
 *      - Siempre muestra los ultimos 90 dias de historia.
 *   2. Matriz de correlacion de Pearson (20x20 heatmap).
 *      - Mapa de calor coloreado: verde = correlacion positiva, rojo = negativa.
 *
 * Ambas visualizaciones usan SVG nativo (sin recharts ni d3).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LineChart, Grid3x3 } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { CandlestickChart } from "@/componentes/panel/CandlestickChart";
import { CorrelationHeatmap } from "@/componentes/panel/CorrelationHeatmap";
import { ASSETS, ASSET_MAP } from "@/lib/finance-data";

/** Definicion de la ruta con titulo de pestaña */
export const Route = createFileRoute("/graficos")({
  component: GraficosPage,
  head: () => ({ meta: [{ title: "Graficos · Quanta" }] }),
});

function GraficosPage() {
  // Ticker del activo actualmente seleccionado para el grafico de velas
  const [selected, setSelected] = useState("ECOPETROL");
  const asset = ASSET_MAP[selected]; // Objeto completo del activo seleccionado

  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── Seccion 1: velas japonesas + medias moviles ── */}
        <section>
          <SectionTitle
            icon={LineChart}
            num="04"
            title="Analisis tecnico · velas + medias moviles"
            hint="SMA 20/50 calculadas algoritmicamente"
          />

          <div className="surface-card p-2">
            {/* Barra de seleccion de activo: un boton por ticker */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-border">
              {ASSETS.map(a => (
                <button
                  key={a.ticker}
                  onClick={() => setSelected(a.ticker)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-sm border transition-colors ${
                    selected === a.ticker
                      ? "border-primary bg-primary/10 text-primary"           // Activo seleccionado
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {a.ticker}
                </button>
              ))}
              {/* Nombre y mercado del activo seleccionado */}
              <div className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground pr-2">
                {asset.name} · {asset.market}
              </div>
            </div>

            {/* Grafico de velas: ultimos 90 dias del activo seleccionado */}
            <div className="p-2">
              <CandlestickChart asset={asset} days={90} />
            </div>
          </div>
        </section>

        {/* ── Seccion 2: heatmap de correlacion ── */}
        <section>
          <SectionTitle
            icon={Grid3x3}
            num="04"
            title="Matriz de correlacion · 20 × 20"
            hint="Pearson sobre retornos diarios · rojo = negativa · verde = positiva"
          />
          {/* Tabla 20x20 coloreada por coeficiente de Pearson */}
          <CorrelationHeatmap />
        </section>

      </main>
    </div>
  );
}
