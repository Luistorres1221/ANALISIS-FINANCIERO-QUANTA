/**
 * Componentes primitivos reutilizables del dashboard.
 *
 * Contiene los bloques de construcción básicos de la interfaz:
 *   - Ticker: banda de precios con desplazamiento animado (Live Feed)
 *   - StatCard: tarjeta de métrica con valor, etiqueta y delta opcional
 *   - SectionTitle: encabezado de sección con ícono y descripción
 */
import { ASSETS, ASSET_MAP, returns, fmt } from "@/lib/finance-data";
import { Activity, Radio } from "lucide-react";

/**
 * Banda de cotizaciones en tiempo real que se desplaza horizontalmente.
 *
 * Muestra los 20 activos con su último precio y el retorno del último día.
 * La animación CSS "ticker-scroll" mueve los elementos de derecha a izquierda.
 * Se duplica la lista para lograr un loop infinito continuo sin saltos visuales.
 *
 * Los colores indican la dirección:
 *   - Verde (--bull): el retorno del último día fue positivo
 *   - Rojo (--bear): el retorno del último día fue negativo
 */
export function Ticker() {
  // Calcula el último retorno y el último precio para cada activo
  const items = ASSETS.map(a => {
    const r    = returns(a.series);
    const last = r[r.length - 1] ?? 0; // Último retorno diario (fallback a 0 si no hay datos)
    return {
      t: a.ticker,                         // Símbolo bursátil
      p: a.series[a.series.length - 1].close, // Último precio de cierre
      c: last,                             // Último retorno (cambio porcentual)
    };
  });

  // Duplica los items para el loop infinito de la animación CSS
  const doubled = [...items, ...items];

  return (
    <div className="border-y border-border bg-card/50 backdrop-blur overflow-hidden">
      <div className="flex items-center">
        {/* Etiqueta fija "Live Feed" a la izquierda */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-r border-border bg-card shrink-0">
          <Radio className="size-3.5 text-bull pulse-dot rounded-full" strokeWidth={3} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Live Feed</span>
        </div>

        {/* Banda desplazante con todos los activos */}
        <div className="overflow-hidden flex-1">
          <div className="ticker-scroll flex gap-8 whitespace-nowrap py-2.5">
            {doubled.map((it, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                {/* Símbolo bursátil */}
                <span className="text-foreground font-semibold">{it.t}</span>
                {/* Último precio formateado con 2 decimales */}
                <span className="text-muted-foreground">{fmt(it.p)}</span>
                {/* Retorno del día con ▲/▼ y color verde/rojo */}
                <span className={it.c >= 0 ? "text-bull" : "text-bear"}>
                  {it.c >= 0 ? "▲" : "▼"} {fmt(Math.abs(it.c) * 100, 2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de métrica financiera con valor principal, etiqueta y delta opcional.
 *
 * @param label  Etiqueta descriptiva mostrada arriba del valor (p.ej. "Volatilidad")
 * @param value  Valor principal formateado como string (p.ej. "23.45%")
 * @param delta  Texto secundario debajo del valor (p.ej. "+1.2% vs ayer") — opcional
 * @param accent Color de acento: "bull" (verde), "bear" (rojo), "primary" (azul), "accent" (naranja)
 */
export function StatCard({
  label, value, delta, accent,
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: "bull" | "bear" | "primary" | "accent";
}) {
  // Determina la clase de color según el acento seleccionado
  const color =
    accent === "bull"    ? "text-bull"    :
    accent === "bear"    ? "text-bear"    :
    accent === "accent"  ? "text-accent"  :
                           "text-primary";

  return (
    <div className="surface-card p-4 relative overflow-hidden group">
      {/* Línea decorativa superior con gradiente */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60" />
      {/* Etiqueta en monospacio pequeño */}
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      {/* Valor principal — grande y en fuente monospace */}
      <div className={`mt-2 text-2xl font-mono font-semibold ${color}`}>{value}</div>
      {/* Delta secundario (opcional) */}
      {delta && <div className="mt-1 text-xs font-mono text-muted-foreground">{delta}</div>}
    </div>
  );
}

/**
 * Encabezado de sección del dashboard con ícono, número de requisito y título.
 *
 * @param icon  Componente de ícono de lucide-react (p.ej. LineChart, BarChart3)
 * @param title Título principal de la sección
 * @param hint  Descripción técnica breve mostrada a la derecha (solo en pantallas medianas+)
 * @param num   Número de requisito académico (p.ej. "04") — opcional
 */
export function SectionTitle({
  icon: Icon, title, hint, num,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  num?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4">
      <div className="flex items-center gap-3">
        {/* Cuadrado con el ícono de la sección */}
        <div className="size-9 rounded-md border border-border bg-card flex items-center justify-center">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          {/* Número de requisito (p.ej. "REQ 04") — se muestra solo si se pasa el prop */}
          {num && (
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
              REQ {num}
            </div>
          )}
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
      </div>
      {/* Texto descriptivo — oculto en móvil, visible en md+ */}
      {hint && (
        <div className="text-xs font-mono text-muted-foreground hidden md:block">{hint}</div>
      )}
    </div>
  );
}
