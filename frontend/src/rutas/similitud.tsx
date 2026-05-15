/**
 * Pagina de similitud entre series temporales ("/similitud") — REQ 02.
 *
 * Contiene dos secciones:
 *   1. SimilarityPanel: herramienta interactiva para comparar dos activos
 *      con cuatro metricas (Pearson, Coseno, Euclidiana, DTW) y un grafico
 *      de series superpuestas normalizadas.
 *   2. DetalleAlgoritmos: tarjetas de referencia con la formula matematica
 *      y la descripcion de cada algoritmo implementado.
 */
import { createFileRoute } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { SimilarityPanel } from "@/componentes/panel/SimilarityPanel";

/** Definicion de la ruta con titulo de pestaña */
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
          hint="4 algoritmos · base matematica explicita"
        />
        {/* Panel interactivo principal con selectores, grafico y metricas */}
        <SimilarityPanel />
        {/* Seccion de referencia con formulas y descripciones de cada algoritmo */}
        <DetalleAlgoritmos />
      </main>
    </div>
  );
}

/**
 * Metadatos de cada algoritmo de similitud implementado.
 * Se muestran como tarjetas de referencia en la parte inferior de la pagina.
 */
const ALGORITMOS = [
  {
    nombre: "Correlacion de Pearson",
    complejidad: "O(n)",
    formula: "r = S(xi - x')(yi - y') / (sx · sy · n)",
    desc: "Mide la relacion lineal entre dos series de retornos. Resultado en [-1, 1]. Robusto para detectar tendencias comunes entre activos.",
  },
  {
    nombre: "Similitud Coseno",
    complejidad: "O(n)",
    formula: "cos(t) = (A · B) / (||A|| · ||B||)",
    desc: "Mide el angulo entre vectores de retornos. Ignora la magnitud y compara solo la direccion del movimiento.",
  },
  {
    nombre: "Distancia Euclidiana",
    complejidad: "O(n)",
    formula: "d = sqrt(S(xi - yi)^2)  (series z-normalizadas)",
    desc: "Distancia punto a punto entre series z-score normalizadas. Penaliza desfases temporales pero es intuitiva y eficiente.",
  },
  {
    nombre: "Dynamic Time Warping",
    complejidad: "O(n · w)",
    formula: "DTW(i,j) = |xi - yj| + min(DTW(i-1,j), DTW(i,j-1), DTW(i-1,j-1))",
    desc: "Alinea series con desfases temporales usando programacion dinamica con banda Sakoe-Chiba (w = 20). Mas robusto que Euclidiana ante ciclos desfasados.",
  },
];

/**
 * Grilla de tarjetas con el detalle matematico de cada algoritmo.
 * Muestra: nombre, complejidad temporal, formula y descripcion.
 */
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
              {/* Badge de complejidad temporal */}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm border border-primary/30 bg-primary/10 text-primary">
                {a.complejidad}
              </span>
            </div>
            {/* Formula matematica en bloque monoespacio */}
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
