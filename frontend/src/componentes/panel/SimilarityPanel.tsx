import { useMemo, useState } from "react";
import { ASSETS, ASSET_MAP, returns, pearson, euclidean, cosine, dtw, fmt } from "@/lib/finance-data";

const ALGOS = [
  { key: "pearson", label: "Pearson", desc: "Correlación lineal de retornos", complexity: "O(n)" },
  { key: "cosine", label: "Coseno", desc: "Similitud direccional de vectores", complexity: "O(n)" },
  { key: "euclidean", label: "Euclidiana", desc: "Distancia sobre precios z-score", complexity: "O(n)" },
  { key: "dtw", label: "DTW", desc: "Dynamic Time Warping (banda)", complexity: "O(n·w)" },
] as const;

export function SimilarityPanel() {
  const [a, setA] = useState("ECOPETROL");
  const [b, setB] = useState("XOM");

  const A = ASSET_MAP[a], B = ASSET_MAP[b];
  const ra = returns(A.series), rb = returns(B.series);
  const closesA = A.series.map(s => s.close);
  const closesB = B.series.map(s => s.close);

  const results = useMemo(() => ({
    pearson: pearson(ra, rb),
    cosine: cosine(ra, rb),
    euclidean: euclidean(closesA, closesB),
    // window DTW on last 120 days (normalized)
    dtw: (() => {
      const n = 120;
      const norm = (arr: number[]) => { const m = arr[0]; return arr.slice(-n).map(x => x / m); };
      return dtw(norm(closesA), norm(closesB), 12);
    })(),
  }), [a, b]);

  // overlay normalized series
  const N = 180;
  const overlayA = closesA.slice(-N).map(v => v / closesA[closesA.length - N]);
  const overlayB = closesB.slice(-N).map(v => v / closesB[closesB.length - N]);
  const all = [...overlayA, ...overlayB];
  const min = Math.min(...all), max = Math.max(...all);
  const W = 1000, H = 220, P = 24;
  const x = (i: number) => P + (i / (N - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - min) / (max - min)) * (H - 2 * P);
  const path = (arr: number[]) => arr.map((v, i) => (i === 0 ? "M" : "L") + x(i) + "," + y(v)).join(" ");

  const score = (k: string, v: number) => {
    if (k === "pearson" || k === "cosine") {
      const pct = ((v + 1) / 2) * 100;
      return { display: v.toFixed(4), bar: pct, color: v > 0.5 ? "var(--bull)" : v < -0.2 ? "var(--bear)" : "var(--primary)" };
    }
    // distance: invert for bar
    const inv = 100 / (1 + v);
    return { display: v.toFixed(3), bar: inv, color: "var(--accent)" };
  };

  return (
    <div className="surface-card p-5">
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <AssetSelect label="Activo A" value={a} onChange={setA} accent="primary" />
        <AssetSelect label="Activo B" value={b} onChange={setB} accent="accent" />
      </div>

      <div className="rounded-md border border-border bg-background/40 p-3 mb-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {[0.25, 0.5, 0.75].map(t => (
            <line key={t} x1={P} x2={W - P} y1={P + t * (H - 2 * P)} y2={P + t * (H - 2 * P)} stroke="var(--grid)" strokeDasharray="2 4" />
          ))}
          <path d={path(overlayA)} fill="none" stroke="var(--primary)" strokeWidth={1.8} />
          <path d={path(overlayB)} fill="none" stroke="var(--accent)" strokeWidth={1.8} />
        </svg>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
          <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: "var(--primary)" }} />{a}</div>
          <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: "var(--accent)" }} />{b}</div>
          <span className="ml-auto">Normalizado · base = 1.00 · ventana 180d</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {ALGOS.map(al => {
          const v = (results as any)[al.key];
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
                <div className="font-mono text-xl tabular-nums" style={{ color: s.color }}>{s.display}</div>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, s.bar))}%`, background: s.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssetSelect({ label, value, onChange, accent }: { label: string; value: string; onChange: (v: string) => void; accent: "primary" | "accent" }) {
  const a = ASSET_MAP[value];
  const last = a.series[a.series.length - 1].close;
  const prev = a.series[a.series.length - 2].close;
  const ch = (last - prev) / prev;
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
        onChange={(e) => onChange(e.target.value)}
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
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{a.market} · {a.sector}</span>
      </div>
    </div>
  );
}
