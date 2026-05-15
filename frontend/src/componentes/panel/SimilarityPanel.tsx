/**
 * Panel de similitud entre dos series temporales.
 *
 * Permite al usuario seleccionar dos activos y un rango de fechas para comparar
 * su comportamiento usando cuatro algoritmos distintos:
 *   - Pearson:    correlacion lineal de retornos diarios      O(n)
 *   - Coseno:     similitud de angulo entre vectores           O(n)
 *   - Euclidiana: distancia entre series z-normalizadas        O(n)
 *   - DTW:        Dynamic Time Warping con banda Sakoe-Chiba   O(n·w)
 *
 * Layout:
 *   1. Selectores de activo A y B (con precio y retorno del ultimo dia)
 *   2. Rango de fechas (inputs type="date" con limites del dataset)
 *   3. Grafico SVG de series superpuestas normalizadas (base = 1.00)
 *   4. Tarjetas de resultado por algoritmo con barra de progreso visual
 *
 * Normalizacion DTW: se divide cada serie por su primer valor para comparar
 * movimientos relativos, no precios absolutos.
 */
import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ASSETS, ASSET_MAP, returns, pearson, euclidean, cosine, dtw, fmt } from "@/lib/finance-data";

/** Definicion de cada algoritmo con metadatos para la UI */
const ALGOS = [
  { key: "pearson",   label: "Pearson",    desc: "Correlacion lineal de retornos",        complexity: "O(n)"   },
  { key: "cosine",    label: "Coseno",     desc: "Similitud direccional de vectores",     complexity: "O(n)"   },
  { key: "euclidean", label: "Euclidiana", desc: "Distancia sobre precios z-score",       complexity: "O(n)"   },
  { key: "dtw",       label: "DTW",        desc: "Dynamic Time Warping (banda)",          complexity: "O(n·w)" },
] as const;

/** Limites del selector de fechas: primera y ultima fecha del dataset */
const FECHA_MIN = ASSETS[0].series[0].date;
const FECHA_MAX = ASSETS[0].series[ASSETS[0].series.length - 1].date;

/**
 * Formatea una fecha ISO "YYYY-MM-DD" al formato legible "DD/MM/YYYY".
 * Retorna "—" si la cadena esta vacia.
 */
function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function SimilarityPanel() {
  // Tickers seleccionados para la comparacion
  const [a, setA] = useState("ECOPETROL");
  const [b, setB] = useState("XOM");

  // Rango de fechas de analisis (inicialmente el dataset completo)
  const [desde, setDesde] = useState(FECHA_MIN);
  const [hasta, setHasta]  = useState(FECHA_MAX);

  const A = ASSET_MAP[a], B = ASSET_MAP[b];

  // Filtra cada serie al rango de fechas seleccionado
  const seriesA = useMemo(
    () => A.series.filter(bar => bar.date >= desde && bar.date <= hasta),
    [A, desde, hasta]
  );
  const seriesB = useMemo(
    () => B.series.filter(bar => bar.date >= desde && bar.date <= hasta),
    [B, desde, hasta]
  );

  // Alinea los arrays al mismo largo (toma el minimo para que el indice sea valido en ambos)
  const len = Math.min(seriesA.length, seriesB.length);
  const sA  = seriesA.slice(seriesA.length - len);
  const sB  = seriesB.slice(seriesB.length - len);

  const closesA = sA.map(s => s.close); // Precios de cierre de A en el rango
  const closesB = sB.map(s => s.close); // Precios de cierre de B en el rango
  const ra = returns(sA);               // Retornos diarios de A
  const rb = returns(sB);               // Retornos diarios de B

  /**
   * Calcula los cuatro indicadores de similitud.
   * Si el rango tiene menos de 5 dias, devuelve ceros (evita NaN/Inf).
   * Para DTW: normaliza por el primer precio y usa ventana w = min(20, n/6).
   */
  const resultados = useMemo(() => {
    if (len < 5) return { pearson: 0, cosine: 0, euclidean: 0, dtw: 0 };
    return {
      pearson:   pearson(ra, rb),
      cosine:    cosine(ra, rb),
      euclidean: euclidean(closesA, closesB),
      dtw: (() => {
        const w = Math.min(20, Math.floor(len / 6)); // Ancho de banda Sakoe-Chiba
        const norm = (arr: number[]) => { const m = arr[0] || 1; return arr.map(x => x / m); };
        return dtw(norm(closesA), norm(closesB), w);
      })(),
    };
  }, [ra, rb, closesA, closesB, len]);

  // ── Grafico SVG de superposicion ──────────────────────────────────────────────
  // Normaliza ambas series a base 1.0 (divide por el primer precio del rango)
  const overlayA = closesA.length > 0 ? closesA.map(v => v / (closesA[0] || 1)) : [];
  const overlayB = closesB.length > 0 ? closesB.map(v => v / (closesB[0] || 1)) : [];

  const all  = [...overlayA, ...overlayB];
  const minV = all.length ? Math.min(...all) : 0;
  const maxV = all.length ? Math.max(...all) : 1;

  // Dimensiones del SVG del grafico de superposicion
  const W = 1000, H = 220, P = 24;

  /** Convierte indice de punto a coordenada X en el SVG */
  const xPos = (i: number, n: number) => P + (i / Math.max(n - 1, 1)) * (W - 2 * P);
  /** Convierte valor normalizado a coordenada Y en el SVG (invertido: arriba = mayor) */
  const yPos = (v: number) => P + (1 - (v - minV) / (maxV - minV || 1)) * (H - 2 * P);
  /** Construye el atributo "d" de un <path> SVG a partir de valores normalizados */
  const path = (arr: number[]) =>
    arr.map((v, i) => (i === 0 ? "M" : "L") + xPos(i, arr.length).toFixed(1) + "," + yPos(v).toFixed(1)).join(" ");

  /**
   * Calcula los valores de visualizacion para la barra de rendimiento de cada metrica.
   * - Pearson y Coseno estan en [-1, 1]: se escalan a [0, 100] para la barra.
   * - Euclidiana y DTW son distancias [0, ∞]: se convierten con 100/(1+v).
   *
   * @param k Clave del algoritmo ("pearson"|"cosine"|"euclidean"|"dtw")
   * @param v Valor calculado por el algoritmo
   */
  const score = (k: string, v: number) => {
    if (k === "pearson" || k === "cosine") {
      const pct = ((v + 1) / 2) * 100;
      return { display: v.toFixed(4), bar: pct, color: v > 0.5 ? "var(--bull)" : v < -0.2 ? "var(--bear)" : "var(--primary)" };
    }
    const inv = 100 / (1 + v); // Distancias pequenas → barra larga (buena similitud)
    return { display: v.toFixed(3), bar: inv, color: "var(--accent)" };
  };

  // Primeras y ultimas fechas reales en el rango filtrado (para mostrar en la leyenda)
  const fechaInicio = sA[0]?.date ?? desde;
  const fechaFin    = sA[sA.length - 1]?.date ?? hasta;

  return (
    <div className="surface-card p-5 space-y-5">

      {/* ── Selectores de activos A y B ── */}
      <div className="grid md:grid-cols-2 gap-3">
        <AssetSelect label="Activo A" value={a} onChange={setA} accent="primary" />
        <AssetSelect label="Activo B" value={b} onChange={setB} accent="accent" />
      </div>

      {/* ── Selector de rango de fechas ── */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-background/40 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <Calendar className="size-3.5" />
          <span>Rango de analisis</span>
        </div>

        {/* Input "Desde" con limite superior = hasta */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Desde
          </label>
          <input
            type="date"
            value={desde}
            min={FECHA_MIN}
            max={hasta}
            onChange={e => setDesde(e.target.value)}
            className="text-sm font-mono tabular-nums bg-background/60 border border-border rounded-sm px-3 py-1.5 text-foreground outline-none focus:border-primary/60 transition-colors [color-scheme:dark] cursor-pointer"
          />
        </div>

        <span className="text-muted-foreground/40 text-xs font-mono self-end pb-2">—</span>

        {/* Input "Hasta" con limite inferior = desde */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            min={desde}
            max={FECHA_MAX}
            onChange={e => setHasta(e.target.value)}
            className="text-sm font-mono tabular-nums bg-background/60 border border-border rounded-sm px-3 py-1.5 text-foreground outline-none focus:border-primary/60 transition-colors [color-scheme:dark] cursor-pointer"
          />
        </div>

        {/* Resumen: dias habiles en el rango y fechas extremas */}
        <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="text-accent">{len.toLocaleString()} dias</span>
          <span>·</span>
          <span>{fmtFecha(fechaInicio)} → {fmtFecha(fechaFin)}</span>
        </div>
      </div>

      {/* Aviso cuando el rango tiene menos de 5 dias habiles */}
      {len < 5 && (
        <div className="rounded-md border border-bear/30 bg-bear/5 px-4 py-3 text-xs font-mono text-bear">
          El rango seleccionado contiene menos de 5 dias habiles. Amplia el rango para calcular la similitud.
        </div>
      )}

      {/* ── Grafico de series superpuestas normalizadas ── */}
      {len >= 5 && (
        <div className="rounded-md border border-border bg-background/40 p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {/* Lineas de referencia horizontales en 25%, 50% y 75% del alto */}
            {[0.25, 0.5, 0.75].map(t => (
              <line key={t}
                x1={P} x2={W - P}
                y1={P + t * (H - 2 * P)} y2={P + t * (H - 2 * P)}
                stroke="var(--grid)" strokeDasharray="2 4" />
            ))}
            {/* Serie A (azul primario) */}
            {overlayA.length > 1 && <path d={path(overlayA)} fill="none" stroke="var(--primary)" strokeWidth={1.8} />}
            {/* Serie B (naranja acento) */}
            {overlayB.length > 1 && <path d={path(overlayB)} fill="none" stroke="var(--accent)"  strokeWidth={1.8} />}
          </svg>

          {/* Leyenda del grafico */}
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5" style={{ background: "var(--primary)" }} />
              {a}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5" style={{ background: "var(--accent)" }} />
              {b}
            </div>
            <span className="ml-auto">
              Normalizado · base = 1.00 · {fmtFecha(fechaInicio)} – {fmtFecha(fechaFin)} · {len} dias
            </span>
          </div>
        </div>
      )}

      {/* ── Tarjetas de metricas de similitud ── */}
      {len >= 5 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {ALGOS.map(al => {
            const v = (resultados as any)[al.key];
            const s = score(al.key, v);
            return (
              <div key={al.key} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-sm font-semibold">{al.label}</div>
                    <div className="text-[11px] text-muted-foreground">{al.desc}</div>
                  </div>
                  <div className="text-[10px] font-mono text-primary/80">{al.complexity}</div>
                </div>

                {/* Valor numerico + barra de rendimiento relativo */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="font-mono text-xl tabular-nums" style={{ color: s.color }}>
                    {s.display}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(2, s.bar))}%`, background: s.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Selector de activo con chip de ultimo precio y retorno del dia.
 *
 * @param label    Etiqueta visible ("Activo A" o "Activo B")
 * @param value    Ticker actualmente seleccionado
 * @param onChange Callback al cambiar la seleccion
 * @param accent   Color del punto indicador ("primary" azul | "accent" naranja)
 */
function AssetSelect({
  label, value, onChange, accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent: "primary" | "accent";
}) {
  const a    = ASSET_MAP[value];
  const last = a.series[a.series.length - 1].close;     // Ultimo precio de cierre
  const prev = a.series[a.series.length - 2].close;     // Precio del dia anterior
  const ch   = (last - prev) / prev;                    // Retorno del ultimo dia
  const dotColor = accent === "primary" ? "var(--primary)" : "var(--accent)";

  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: dotColor }} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        {/* Retorno del dia con signo explicito */}
        <span className={`text-xs font-mono ${ch >= 0 ? "text-bull" : "text-bear"}`}>
          {ch >= 0 ? "+" : ""}{(ch * 100).toFixed(2)}%
        </span>
      </div>

      {/* Dropdown con todos los activos disponibles */}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent text-base font-semibold tracking-tight outline-none cursor-pointer"
      >
        {ASSETS.map(opt => (
          <option key={opt.ticker} value={opt.ticker} className="bg-card">
            {opt.ticker} — {opt.name}
          </option>
        ))}
      </select>

      {/* Ultimo precio y metadata del activo */}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-lg">{fmt(last)}</span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          {a.market} · {a.sector}
        </span>
      </div>
    </div>
  );
}
