import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ASSETS, ASSET_MAP, returns, pearson, euclidean, cosine, dtw, fmt } from "@/lib/finance-data";

const ALGOS = [
  { key: "pearson",   label: "Pearson",    desc: "Correlación lineal de retornos",        complexity: "O(n)"   },
  { key: "cosine",    label: "Coseno",     desc: "Similitud direccional de vectores",     complexity: "O(n)"   },
  { key: "euclidean", label: "Euclidiana", desc: "Distancia sobre precios z-score",       complexity: "O(n)"   },
  { key: "dtw",       label: "DTW",        desc: "Dynamic Time Warping (banda)",          complexity: "O(n·w)" },
] as const;

// Dates come in "YYYY-MM-DD" — ISO string comparison works correctly
const FECHA_MIN = ASSETS[0].series[0].date;
const FECHA_MAX = ASSETS[0].series[ASSETS[0].series.length - 1].date;

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function SimilarityPanel() {
  const [a, setA] = useState("ECOPETROL");
  const [b, setB] = useState("XOM");
  const [desde, setDesde] = useState(FECHA_MIN);
  const [hasta, setHasta]  = useState(FECHA_MAX);

  const A = ASSET_MAP[a], B = ASSET_MAP[b];

  // Filter both series to the selected date range
  const seriesA = useMemo(
    () => A.series.filter(bar => bar.date >= desde && bar.date <= hasta),
    [A, desde, hasta]
  );
  const seriesB = useMemo(
    () => B.series.filter(bar => bar.date >= desde && bar.date <= hasta),
    [B, desde, hasta]
  );

  // Use the shorter length so arrays are aligned
  const len = Math.min(seriesA.length, seriesB.length);
  const sA  = seriesA.slice(seriesA.length - len);
  const sB  = seriesB.slice(seriesB.length - len);

  const closesA = sA.map(s => s.close);
  const closesB = sB.map(s => s.close);
  const ra = returns(sA);
  const rb = returns(sB);

  const resultados = useMemo(() => {
    if (len < 5) return { pearson: 0, cosine: 0, euclidean: 0, dtw: 0 };
    return {
      pearson:   pearson(ra, rb),
      cosine:    cosine(ra, rb),
      euclidean: euclidean(closesA, closesB),
      dtw: (() => {
        const w = Math.min(20, Math.floor(len / 6));
        const norm = (arr: number[]) => { const m = arr[0] || 1; return arr.map(x => x / m); };
        return dtw(norm(closesA), norm(closesB), w);
      })(),
    };
  }, [ra, rb, closesA, closesB, len]);

  // Overlay chart — normalized series
  const overlayA = closesA.length > 0
    ? closesA.map(v => v / (closesA[0] || 1))
    : [];
  const overlayB = closesB.length > 0
    ? closesB.map(v => v / (closesB[0] || 1))
    : [];
  const all = [...overlayA, ...overlayB];
  const minV = all.length ? Math.min(...all) : 0;
  const maxV = all.length ? Math.max(...all) : 1;
  const W = 1000, H = 220, P = 24;
  const xPos = (i: number, n: number) => P + (i / Math.max(n - 1, 1)) * (W - 2 * P);
  const yPos = (v: number) => P + (1 - (v - minV) / (maxV - minV || 1)) * (H - 2 * P);
  const path = (arr: number[]) =>
    arr.map((v, i) => (i === 0 ? "M" : "L") + xPos(i, arr.length).toFixed(1) + "," + yPos(v).toFixed(1)).join(" ");

  const score = (k: string, v: number) => {
    if (k === "pearson" || k === "cosine") {
      const pct = ((v + 1) / 2) * 100;
      return { display: v.toFixed(4), bar: pct, color: v > 0.5 ? "var(--bull)" : v < -0.2 ? "var(--bear)" : "var(--primary)" };
    }
    const inv = 100 / (1 + v);
    return { display: v.toFixed(3), bar: inv, color: "var(--accent)" };
  };

  // Actual first/last date in filtered range
  const fechaInicio = sA[0]?.date ?? desde;
  const fechaFin    = sA[sA.length - 1]?.date ?? hasta;

  return (
    <div className="surface-card p-5 space-y-5">

      {/* ── Selectores de activos ─────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">
        <AssetSelect label="Activo A" value={a} onChange={setA} accent="primary" />
        <AssetSelect label="Activo B" value={b} onChange={setB} accent="accent" />
      </div>

      {/* ── Rango de fechas ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-background/40 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <Calendar className="size-3.5" />
          <span>Rango de análisis</span>
        </div>

        {/* Desde */}
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

        {/* Separador */}
        <span className="text-muted-foreground/40 text-xs font-mono self-end pb-2">—</span>

        {/* Hasta */}
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

        {/* Resumen del rango */}
        <div className="ml-auto flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="text-accent">{len.toLocaleString()} días</span>
          <span>·</span>
          <span>{fmtFecha(fechaInicio)} → {fmtFecha(fechaFin)}</span>
        </div>
      </div>

      {/* ── Sin datos ─────────────────────────────────────────────────────── */}
      {len < 5 && (
        <div className="rounded-md border border-bear/30 bg-bear/5 px-4 py-3 text-xs font-mono text-bear">
          El rango seleccionado contiene menos de 5 días hábiles. Amplía el rango para calcular la similitud.
        </div>
      )}

      {/* ── Gráfico de series superpuestas ────────────────────────────────── */}
      {len >= 5 && (
        <div className="rounded-md border border-border bg-background/40 p-3">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {[0.25, 0.5, 0.75].map(t => (
              <line key={t}
                x1={P} x2={W - P}
                y1={P + t * (H - 2 * P)} y2={P + t * (H - 2 * P)}
                stroke="var(--grid)" strokeDasharray="2 4" />
            ))}
            {overlayA.length > 1 && <path d={path(overlayA)} fill="none" stroke="var(--primary)" strokeWidth={1.8} />}
            {overlayB.length > 1 && <path d={path(overlayB)} fill="none" stroke="var(--accent)"  strokeWidth={1.8} />}
          </svg>
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
              Normalizado · base = 1.00 · {fmtFecha(fechaInicio)} – {fmtFecha(fechaFin)} · {len} días
            </span>
          </div>
        </div>
      )}

      {/* ── Métricas de similitud ─────────────────────────────────────────── */}
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

function AssetSelect({
  label, value, onChange, accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent: "primary" | "accent";
}) {
  const a    = ASSET_MAP[value];
  const last = a.series[a.series.length - 1].close;
  const prev = a.series[a.series.length - 2].close;
  const ch   = (last - prev) / prev;
  const dotColor = accent === "primary" ? "var(--primary)" : "var(--accent)";
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: dotColor }} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        </div>
        <span className={`text-xs font-mono ${ch >= 0 ? "text-bull" : "text-bear"}`}>
          {ch >= 0 ? "+" : ""}{(ch * 100).toFixed(2)}%
        </span>
      </div>
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
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-lg">{fmt(last)}</span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          {a.market} · {a.sector}
        </span>
      </div>
    </div>
  );
}
