import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LineChart, Grid3x3 } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { CandlestickChart } from "@/componentes/panel/CandlestickChart";
import { CorrelationHeatmap } from "@/componentes/panel/CorrelationHeatmap";
import { ASSETS, ASSET_MAP } from "@/lib/finance-data";

export const Route = createFileRoute("/graficos")({
  component: GraficosPage,
  head: () => ({ meta: [{ title: "Gráficos · Quanta" }] }),
});

function GraficosPage() {
  const [selected, setSelected] = useState("ECOPETROL");
  const asset = ASSET_MAP[selected];

  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* Velas japonesas + SMA */}
        <section>
          <SectionTitle
            icon={LineChart}
            num="04"
            title="Análisis técnico · velas + medias móviles"
            hint="SMA 20/50 calculadas algorítmicamente"
          />
          <div className="surface-card p-2">
            <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-border">
              {ASSETS.map(a => (
                <button
                  key={a.ticker}
                  onClick={() => setSelected(a.ticker)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-sm border transition-colors ${
                    selected === a.ticker
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {a.ticker}
                </button>
              ))}
              <div className="ml-auto text-[10px] font-mono uppercase tracking-widest text-muted-foreground pr-2">
                {asset.name} · {asset.market}
              </div>
            </div>
            <div className="p-2">
              <CandlestickChart asset={asset} days={90} />
            </div>
          </div>
        </section>

        {/* Heatmap correlación */}
        <section>
          <SectionTitle
            icon={Grid3x3}
            num="04"
            title="Matriz de correlación · 20 × 20"
            hint="Pearson sobre retornos diarios · rojo = negativa · verde = positiva"
          />
          <CorrelationHeatmap />
        </section>

      </main>
    </div>
  );
}
