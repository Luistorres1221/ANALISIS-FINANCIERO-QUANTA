import { createFileRoute } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { SimilarityPanel } from "@/componentes/panel/SimilarityPanel";

export const Route = createFileRoute("/similitud")({
  component: SimilitudPage,
  head: () => ({ meta: [{ title: "Similitud · Quanta" }] }),
});

function SimilitudPage() {
  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">
        <SectionTitle
          icon={GitCompareArrows}
          num="02"
          title="Similitud entre series temporales"
          hint="4 algoritmos · base matemática explícita"
        />
        <SimilarityPanel />
        <DetalleAlgoritmos />
      </main>
    </div>
  );
}

const ALGORITMOS = [
  {
    nombre: "Correlación de Pearson",
    complejidad: "O(n)",
    formula: "ρ = Σ(xᵢ − x̄)(yᵢ − ȳ) / (σₓ · σᵧ · n)",
    desc: "Mide la relación lineal entre dos series de retornos. Resultado en [−1, 1]. Robusto para detectar tendencias comunes entre activos.",
  },
  {
    nombre: "Similitud Coseno",
    complejidad: "O(n)",
    formula: "cos(θ) = (A · B) / (‖A‖ · ‖B‖)",
    desc: "Mide el ángulo entre vectores de retornos. Ignora la magnitud y compara solo la dirección del movimiento.",
  },
  {
    nombre: "Distancia Euclidiana",
    complejidad: "O(n)",
    formula: "d = √Σ(xᵢ − yᵢ)²  (series z-normalizadas)",
    desc: "Distancia punto a punto entre series z-score normalizadas. Penaliza desfases temporales pero es intuitiva y eficiente.",
  },
  {
    nombre: "Dynamic Time Warping",
    complejidad: "O(n · w)",
    formula: "DTW(i,j) = |xᵢ − yⱼ| + min(DTW(i−1,j), DTW(i,j−1), DTW(i−1,j−1))",
    desc: "Alinea series con desfases temporales usando programación dinámica con banda Sakoe-Chiba (w = 20). Más robusto que Euclidiana ante ciclos desfasados.",
  },
];

function DetalleAlgoritmos() {
  return (
    <section>
      <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
        Detalle de algoritmos implementados
      </h3>
      <div className="grid md:grid-cols-2 gap-3">
        {ALGORITMOS.map(a => (
          <div key={a.nombre} className="surface-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">{a.nombre}</div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm border border-primary/30 bg-primary/10 text-primary">
                {a.complejidad}
              </span>
            </div>
            <div className="text-[11px] font-mono text-accent bg-background/50 rounded-sm px-3 py-2 mb-3 break-all leading-relaxed">
              {a.formula}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
