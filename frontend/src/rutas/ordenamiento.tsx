import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, TrendingUp, BarChart2, Layers } from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";

export const Route = createFileRoute("/ordenamiento")({
  component: OrdenamientoPage,
  head: () => ({ meta: [{ title: "Ordenamiento · Quanta" }] }),
});

// ─── Algorithm colors ─────────────────────────────────────────────────────────

const COLORS: Record<string, string> = {
  GnomeSort:           "#f87171",
  BinaryInsertionSort: "#fb923c",
  HeapSort:            "#fbbf24",
  QuickSort:           "#4ade80",
  BitonicSort:         "#34d399",
  TimSort:             "#22d3ee",
  CombSort:            "#60a5fa",
  SelectionSort:       "#818cf8",
  TreeSort:            "#a78bfa",
  BucketSort:          "#e879f9",
  RadixSort:           "#f472b6",
  PigeonholeSort:      "#94a3b8",
};

const COMPLEXITY: Record<string, { time: string; space: string; stable: boolean; clase: string }> = {
  GnomeSort:           { time: "O(n²)",        space: "O(1)",     stable: true,  clase: "Cuadrático"     },
  BinaryInsertionSort: { time: "O(n²)",        space: "O(1)",     stable: true,  clase: "Cuadrático"     },
  HeapSort:            { time: "O(n log n)",   space: "O(1)",     stable: false, clase: "Log-lineal"     },
  QuickSort:           { time: "O(n log n)*",  space: "O(log n)", stable: false, clase: "Log-lineal"     },
  BitonicSort:         { time: "O(n log² n)",  space: "O(log²n)", stable: false, clase: "Log-cuadrático" },
  TimSort:             { time: "O(n log n)",   space: "O(n)",     stable: true,  clase: "Log-lineal"     },
  CombSort:            { time: "O(n²)",        space: "O(1)",     stable: false, clase: "Cuadrático"     },
  SelectionSort:       { time: "O(n²)",        space: "O(1)",     stable: false, clase: "Cuadrático"     },
  TreeSort:            { time: "O(n log n)",   space: "O(n)",     stable: false, clase: "Log-lineal"     },
  BucketSort:          { time: "O(n + k)",     space: "O(n)",     stable: true,  clase: "Lineal"         },
  RadixSort:           { time: "O(d · n)",     space: "O(n+k)",   stable: true,  clase: "Lineal"         },
  PigeonholeSort:      { time: "O(n + rango)", space: "O(rango)", stable: true,  clase: "Lineal"         },
};

// ─── Sorting algorithms (explicit — no Array.sort) ────────────────────────────

function gnomeSort(a: number[]): void {
  let i = 0;
  while (i < a.length) {
    if (i === 0 || a[i] >= a[i-1]) i++;
    else { [a[i], a[i-1]] = [a[i-1], a[i]]; i--; }
  }
}

function binaryInsertionSort(a: number[]): void {
  for (let i = 1; i < a.length; i++) {
    const key = a[i]; let lo = 0, hi = i;
    while (lo < hi) { const m = (lo+hi)>>>1; if (a[m] <= key) lo = m+1; else hi = m; }
    a.copyWithin(lo+1, lo, i); a[lo] = key;
  }
}

function _heapify(a: number[], n: number, i: number): void {
  let lg = i; const l = 2*i+1, r = 2*i+2;
  if (l < n && a[l] > a[lg]) lg = l;
  if (r < n && a[r] > a[lg]) lg = r;
  if (lg !== i) { [a[i], a[lg]] = [a[lg], a[i]]; _heapify(a, n, lg); }
}
function heapSort(a: number[]): void {
  const n = a.length;
  for (let i = Math.floor(n/2)-1; i >= 0; i--) _heapify(a, n, i);
  for (let i = n-1; i > 0; i--) { [a[0], a[i]] = [a[i], a[0]]; _heapify(a, i, 0); }
}

function _part(a: number[], lo: number, hi: number): number {
  const p = a[hi]; let i = lo-1;
  for (let j = lo; j < hi; j++) if (a[j] <= p) { i++; [a[i], a[j]] = [a[j], a[i]]; }
  [a[i+1], a[hi]] = [a[hi], a[i+1]]; return i+1;
}
function quickSort(a: number[], lo = 0, hi = a.length-1): void {
  if (lo < hi) { const p = _part(a, lo, hi); quickSort(a, lo, p-1); quickSort(a, p+1, hi); }
}

function _bMerge(a: number[], lo: number, cnt: number, dir: boolean): void {
  if (cnt <= 1) return; const k = Math.floor(cnt/2);
  for (let i = lo; i < lo+k; i++) if (dir === (a[i] > a[i+k])) [a[i], a[i+k]] = [a[i+k], a[i]];
  _bMerge(a, lo, k, dir); _bMerge(a, lo+k, cnt-k, dir);
}
function _bitonicRec(a: number[], lo: number, cnt: number, dir: boolean): void {
  if (cnt <= 1) return; const k = Math.floor(cnt/2);
  _bitonicRec(a, lo, k, true); _bitonicRec(a, lo+k, cnt-k, false); _bMerge(a, lo, cnt, dir);
}
function bitonicSort(a: number[]): void { _bitonicRec(a, 0, a.length, true); }

function _mrg(a: number[], l: number, m: number, r: number): void {
  const L = a.slice(l, m+1), R = a.slice(m+1, r+1); let i = 0, j = 0, k = l;
  while (i < L.length && j < R.length) a[k++] = L[i] <= R[j] ? L[i++] : R[j++];
  while (i < L.length) a[k++] = L[i++]; while (j < R.length) a[k++] = R[j++];
}
function _insRun(a: number[], l: number, r: number): void {
  for (let i = l+1; i <= r; i++) {
    const key = a[i]; let j = i-1;
    while (j >= l && a[j] > key) { a[j+1] = a[j]; j--; } a[j+1] = key;
  }
}
function timSort(a: number[]): void {
  const RUN = 32, n = a.length;
  for (let i = 0; i < n; i += RUN) _insRun(a, i, Math.min(i+RUN-1, n-1));
  for (let sz = RUN; sz < n; sz *= 2)
    for (let l = 0; l < n; l += 2*sz) {
      const m = Math.min(l+sz-1, n-1), r = Math.min(l+2*sz-1, n-1);
      if (m < r) _mrg(a, l, m, r);
    }
}

function combSort(a: number[]): void {
  let gap = a.length, sw = true;
  while (gap !== 1 || sw) {
    gap = Math.max(1, Math.floor(gap/1.3)); sw = false;
    for (let i = 0; i+gap < a.length; i++)
      if (a[i] > a[i+gap]) { [a[i], a[i+gap]] = [a[i+gap], a[i]]; sw = true; }
  }
}

function selectionSort(a: number[]): void {
  for (let i = 0; i < a.length-1; i++) {
    let mi = i;
    for (let j = i+1; j < a.length; j++) if (a[j] < a[mi]) mi = j;
    if (mi !== i) [a[i], a[mi]] = [a[mi], a[i]];
  }
}

interface BSTNode { v: number; l: BSTNode|null; r: BSTNode|null; }
function _ins(root: BSTNode|null, v: number): BSTNode {
  if (!root) return { v, l: null, r: null };
  if (v < root.v) root.l = _ins(root.l, v); else root.r = _ins(root.r, v); return root;
}
function _ino(root: BSTNode|null, a: number[], idx: { i: number }): void {
  if (!root) return; _ino(root.l, a, idx); a[idx.i++] = root.v; _ino(root.r, a, idx);
}
function treeSort(a: number[]): void {
  let root: BSTNode|null = null;
  for (const v of a) root = _ins(root, v);
  _ino(root, a, { i: 0 });
}

function bucketSort(a: number[]): void {
  if (!a.length) return;
  const mn = Math.min(...a), mx = Math.max(...a), range = mx-mn, n = a.length;
  const bkts: number[][] = Array.from({ length: n }, () => []);
  for (const v of a) { const i = range === 0 ? 0 : Math.min(Math.floor(((v-mn)/range)*(n-1)), n-1); bkts[i].push(v); }
  let k = 0;
  for (const b of bkts) {
    for (let i = 1; i < b.length; i++) { const key = b[i]; let j = i-1; while (j >= 0 && b[j] > key) { b[j+1] = b[j]; j--; } b[j+1] = key; }
    for (const v of b) a[k++] = v;
  }
}

function _cntD(a: number[], exp: number): void {
  const n = a.length, out = new Array<number>(n), cnt = new Array<number>(10).fill(0);
  for (const v of a) cnt[Math.floor(v/exp)%10]++;
  for (let i = 1; i < 10; i++) cnt[i] += cnt[i-1];
  for (let i = n-1; i >= 0; i--) { const d = Math.floor(a[i]/exp)%10; out[--cnt[d]] = a[i]; }
  for (let i = 0; i < n; i++) a[i] = out[i];
}
function radixSort(a: number[]): void {
  if (!a.length) return; const mx = Math.max(...a);
  for (let e = 1; Math.floor(mx/e) > 0; e *= 10) _cntD(a, e);
}

function pigeonholeSort(a: number[]): void {
  if (!a.length) return;
  const mn = Math.min(...a), mx = Math.max(...a);
  const holes = new Array<number>(mx-mn+1).fill(0);
  for (const v of a) holes[v-mn]++; let k = 0;
  for (let i = 0; i < holes.length; i++) while (holes[i]-- > 0) a[k++] = i+mn;
}

const ALGOS: { name: string; fn: (a: number[]) => void }[] = [
  { name: "GnomeSort",            fn: gnomeSort           },
  { name: "BinaryInsertionSort",  fn: binaryInsertionSort },
  { name: "HeapSort",             fn: heapSort            },
  { name: "QuickSort",            fn: quickSort           },
  { name: "BitonicSort",          fn: bitonicSort         },
  { name: "TimSort",              fn: timSort             },
  { name: "CombSort",             fn: combSort            },
  { name: "SelectionSort",        fn: selectionSort       },
  { name: "TreeSort",             fn: treeSort            },
  { name: "BucketSort",           fn: bucketSort          },
  { name: "RadixSort",            fn: radixSort           },
  { name: "PigeonholeSort",       fn: pigeonholeSort      },
];

// ─── Benchmark ────────────────────────────────────────────────────────────────

function genArr(n: number): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(Math.floor(Math.random() * n * 10 + 1));
  return a;
}

function benchOne(fn: (a: number[]) => void, base: number[], runs = 6): number {
  let t = 0;
  for (let r = 0; r < runs; r++) { const c = base.slice(); const t0 = performance.now(); fn(c); t += performance.now() - t0; }
  return (t / runs) * 1_000_000;
}

const SCALE_SIZES = [8, 16, 32, 64, 128, 256, 512];

export interface BenchData {
  n: number;
  bars: { name: string; ns: number }[];
  lines: { name: string; points: { size: number; ns: number }[] }[];
}

function runFullBenchmark(n: number): BenchData {
  const base = genArr(n);
  const bars = ALGOS.map(({ name, fn }) => ({ name, ns: benchOne(fn, base) }));

  const lines = ALGOS.map(({ name, fn }) => ({
    name,
    points: SCALE_SIZES.map(sz => ({ size: sz, ns: benchOne(fn, genArr(sz), 4) })),
  }));

  return { n, bars, lines };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNs(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + " ms";
  if (v >= 1_000)     return (v / 1_000).toFixed(2) + " µs";
  return v.toFixed(0) + " ns";
}

function niceMax(v: number): number {
  if (v === 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / exp) * exp;
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCards({ data }: { data: BenchData }) {
  const sorted = [...data.bars].sort((a, b) => a.ns - b.ns);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];
  const ratio = slowest.ns / fastest.ns;

  const cards = [
    {
      icon: Zap,
      label: "Más rápido",
      value: fastest.name,
      sub: fmtNs(fastest.ns),
      accent: "#4ade80",
    },
    {
      icon: TrendingUp,
      label: "Más lento",
      value: slowest.name,
      sub: fmtNs(slowest.ns),
      accent: "#f87171",
    },
    {
      icon: BarChart2,
      label: "Ratio lento / rápido",
      value: `×${ratio.toFixed(1)}`,
      sub: "diferencia relativa",
      accent: "#fbbf24",
    },
    {
      icon: Layers,
      label: "Algoritmos evaluados",
      value: String(data.bars.length),
      sub: `n = ${data.n.toLocaleString()} elementos`,
      accent: "#60a5fa",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="surface-card p-4 flex items-start gap-3">
          <div
            className="size-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: c.accent + "20", border: `1px solid ${c.accent}40` }}
          >
            <c.icon className="size-4" style={{ color: c.accent }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{c.label}</div>
            <div className="text-sm font-bold mt-0.5 truncate">{c.value}</div>
            <div className="text-[11px] text-muted-foreground">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const B = { t: 32, r: 20, b: 90, l: 82 };
const BW = 860, BH = 320;
const bIW = BW - B.l - B.r, bIH = BH - B.t - B.b;

function BarChart({ data }: { data: BenchData }) {
  const [hov, setHov] = useState<string | null>(null);
  const sorted = [...data.bars].sort((a, b) => a.ns - b.ns);
  const maxV = niceMax(Math.max(...sorted.map(r => r.ns)));
  const barW = Math.max(8, Math.floor(bIW / sorted.length) - 6);
  const ticks = 5;

  return (
    <div className="surface-card p-5">
      <div className="mb-1">
        <div className="text-sm font-semibold">Comparación de tiempos · n = {data.n.toLocaleString()}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Barras ordenadas de más rápido (izq.) a más lento (der.)</div>
      </div>

      <div className="overflow-x-auto mt-3">
        <svg viewBox={`0 0 ${BW} ${BH}`} width="100%" style={{ minWidth: 560 }} className="select-none">
          {/* Y axis label */}
          <text x={12} y={B.t + bIH/2} textAnchor="middle"
            transform={`rotate(-90,12,${B.t + bIH/2})`}
            fontSize={9} fontFamily="monospace" fill="rgba(255,255,255,.4)">
            Nanosegundos (ns)
          </text>

          {/* Y ticks */}
          {Array.from({ length: ticks+1 }, (_, i) => {
            const val = (maxV / ticks) * i;
            const y = B.t + bIH - (val / maxV) * bIH;
            return (
              <g key={i}>
                <line x1={B.l} y1={y} x2={B.l+bIW} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth={1}/>
                <text x={B.l-6} y={y+3.5} textAnchor="end" fontSize={9} fontFamily="monospace" fill="rgba(255,255,255,.4)">
                  {fmtNs(val)}
                </text>
              </g>
            );
          })}

          {/* X axis */}
          <line x1={B.l} y1={B.t+bIH} x2={B.l+bIW} y2={B.t+bIH} stroke="rgba(255,255,255,.15)" strokeWidth={1}/>

          {/* Bars */}
          {sorted.map((r, i) => {
            const barH = Math.max(2, (r.ns / maxV) * bIH);
            const slot = bIW / sorted.length;
            const x = B.l + i * slot + (slot - barW) / 2;
            const y = B.t + bIH - barH;
            const col = COLORS[r.name] ?? "#60a5fa";
            const active = hov === r.name;

            return (
              <g key={r.name} onMouseEnter={() => setHov(r.name)} onMouseLeave={() => setHov(null)}>
                {/* glow */}
                {active && (
                  <rect x={x-2} y={y-2} width={barW+4} height={barH+4} rx={4}
                    fill={col} opacity={0.15}/>
                )}
                <rect x={x} y={y} width={barW} height={barH} rx={3}
                  fill={active ? col : col + "cc"}
                  style={{ transition: "fill .15s" }}/>

                {/* tooltip */}
                {active && (
                  <text x={x+barW/2} y={y-6} textAnchor="middle" fontSize={9}
                    fontFamily="monospace" fill={col}>
                    {fmtNs(r.ns)}
                  </text>
                )}

                {/* x label */}
                <text x={x+barW/2} y={B.t+bIH+8} fontSize={9} fontFamily="monospace"
                  textAnchor="end"
                  fill={active ? "white" : "rgba(255,255,255,.5)"}
                  transform={`rotate(-42,${x+barW/2},${B.t+bIH+8})`}>
                  {r.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground mt-1">
        {sorted.length} algoritmos · promedio de 6 ejecuciones
      </p>
    </div>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

const L = { t: 28, r: 20, b: 48, l: 82 };
const LW = 860, LH = 340;
const lIW = LW - L.l - L.r, lIH = LH - L.t - L.b;

function LineChart({ data }: { data: BenchData }) {
  const [hov, setHov] = useState<string | null>(null);

  const maxY = niceMax(Math.max(...data.lines.flatMap(l => l.points.map(p => p.ns))));
  const sizes = SCALE_SIZES;
  const ticks = 5;

  function xPos(sz: number): number {
    const i = sizes.indexOf(sz);
    return L.l + (i / (sizes.length - 1)) * lIW;
  }
  function yPos(ns: number): number {
    return L.t + lIH - (ns / maxY) * lIH;
  }

  return (
    <div className="surface-card p-5">
      <div className="mb-1">
        <div className="text-sm font-semibold">Curva de escalabilidad</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Cómo crece el tiempo de cada algoritmo al aumentar el tamaño del arreglo
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <svg viewBox={`0 0 ${LW} ${LH}`} width="100%" style={{ minWidth: 560 }} className="select-none">
          {/* Y axis label */}
          <text x={12} y={L.t+lIH/2} textAnchor="middle"
            transform={`rotate(-90,12,${L.t+lIH/2})`}
            fontSize={9} fontFamily="monospace" fill="rgba(255,255,255,.4)">
            Nanosegundos (ns)
          </text>

          {/* Y gridlines */}
          {Array.from({ length: ticks+1 }, (_, i) => {
            const val = (maxY / ticks) * i;
            const y = yPos(val);
            return (
              <g key={i}>
                <line x1={L.l} y1={y} x2={L.l+lIW} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth={1}/>
                <text x={L.l-6} y={y+3.5} textAnchor="end" fontSize={9} fontFamily="monospace" fill="rgba(255,255,255,.4)">
                  {fmtNs(val)}
                </text>
              </g>
            );
          })}

          {/* X gridlines + labels */}
          {sizes.map(sz => {
            const x = xPos(sz);
            return (
              <g key={sz}>
                <line x1={x} y1={L.t} x2={x} y2={L.t+lIH} stroke="rgba(255,255,255,.06)" strokeWidth={1}/>
                <text x={x} y={L.t+lIH+14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="rgba(255,255,255,.4)">
                  {sz}
                </text>
              </g>
            );
          })}

          {/* X axis line */}
          <line x1={L.l} y1={L.t+lIH} x2={L.l+lIW} y2={L.t+lIH} stroke="rgba(255,255,255,.15)" strokeWidth={1}/>
          {/* X axis title */}
          <text x={L.l+lIW/2} y={LH-2} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="rgba(255,255,255,.4)">
            Tamaño del arreglo (n)
          </text>

          {/* Lines */}
          {data.lines.map(algo => {
            const col = COLORS[algo.name] ?? "#60a5fa";
            const active = hov === algo.name;
            const pts = algo.points.map(p => `${xPos(p.size)},${yPos(p.ns)}`).join(" ");

            return (
              <g key={algo.name}
                onMouseEnter={() => setHov(algo.name)}
                onMouseLeave={() => setHov(null)}
                style={{ cursor: "default" }}>
                <polyline points={pts} fill="none"
                  stroke={active ? col : col + "80"}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeLinejoin="round" strokeLinecap="round"
                  style={{ transition: "stroke .15s, stroke-width .15s" }}/>

                {/* Dots */}
                {algo.points.map(p => (
                  <circle key={p.size} cx={xPos(p.size)} cy={yPos(p.ns)} r={active ? 4 : 2.5}
                    fill={active ? col : col + "99"}
                    style={{ transition: "r .15s, fill .15s" }}/>
                ))}

                {/* Tooltip on last point when hovered */}
                {active && (() => {
                  const last = algo.points[algo.points.length - 1];
                  return (
                    <text x={xPos(last.size)+8} y={yPos(last.ns)-4} fontSize={9}
                      fontFamily="monospace" fill={col}>
                      {algo.name}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {ALGOS.map(({ name }) => {
          const col = COLORS[name];
          const active = hov === name;
          return (
            <button
              key={name}
              onMouseEnter={() => setHov(name)}
              onMouseLeave={() => setHov(null)}
              className="flex items-center gap-1.5 text-[10px] font-mono transition-opacity"
              style={{ opacity: hov && !active ? 0.4 : 1 }}
            >
              <span className="inline-block w-4 h-0.5 rounded-full" style={{ background: col }}/>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: col }}/>
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Results Table ────────────────────────────────────────────────────────────

function ResultsTable({ data }: { data: BenchData }) {
  const sorted = [...data.bars].sort((a, b) => a.ns - b.ns);
  const maxNs = sorted[sorted.length - 1].ns;
  const minNs = sorted[0].ns;

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="text-sm font-semibold">Resultados detallados</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Promedio de 6 ejecuciones · mismo arreglo aleatorio · ordenados por tiempo ascendente
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-background/30 text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-normal w-8">#</th>
              <th className="px-4 py-2.5 text-left font-normal">Algoritmo</th>
              <th className="px-4 py-2.5 text-right font-normal">Tiempo</th>
              <th className="px-4 py-2.5 text-left font-normal w-44">Rendimiento relativo</th>
              <th className="px-4 py-2.5 text-center font-normal">Complejidad T.</th>
              <th className="px-4 py-2.5 text-center font-normal">Espacio</th>
              <th className="px-4 py-2.5 text-center font-normal">Clase</th>
              <th className="px-4 py-2.5 text-center font-normal">Estable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const col  = COLORS[r.name] ?? "#60a5fa";
              const cx   = COMPLEXITY[r.name];
              const pct  = maxNs > 0 ? (r.ns / maxNs) * 100 : 0;
              const ratio = r.ns / minNs;
              const isFastest = i === 0;
              const isSlowest = i === sorted.length - 1;

              return (
                <tr key={r.name}
                  className={`border-b border-border/40 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "bg-background/10" : ""}`}>
                  <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col }}/>
                      <span className="font-semibold">{r.name}</span>
                      {isFastest && <span className="text-[9px] px-1.5 py-0.5 rounded-sm border border-bull/40 bg-bull/10 text-bull">más rápido</span>}
                      {isSlowest && <span className="text-[9px] px-1.5 py-0.5 rounded-sm border border-bear/40 bg-bear/10 text-bear">más lento</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: col }}>
                    <div>{fmtNs(r.ns)}</div>
                    {ratio > 1 && <div className="text-[10px] text-muted-foreground">×{ratio.toFixed(1)}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="h-2 rounded-full bg-secondary overflow-hidden w-36">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col, transition: "width .3s" }}/>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{cx?.time ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{cx?.space ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{cx?.clase ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cx?.stable ? "text-bull" : "text-bear"}>{cx?.stable ? "Sí" : "No"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrdenamientoPage() {
  const [inputVal, setInputVal] = useState("64");
  const [data,     setData]     = useState<BenchData | null>(null);
  const [running,  setRunning]  = useState(false);

  function ejecutar() {
    const n = Math.max(2, Math.min(10_000, parseInt(inputVal, 10) || 64));
    setInputVal(String(n));
    setRunning(true);
    setTimeout(() => {
      setData(runFullBenchmark(n));
      setRunning(false);
    }, 20);
  }

  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold">Benchmark de ordenamiento</h2>
            <p className="text-[11px] text-accent mt-1 max-w-xl">
              Comparación de 12 algoritmos según el tiempo medido; barras en orden ascendente
              de izquierda a derecha (más rápido a la izquierda).
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-end gap-3 flex-shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Tamaño{" "}
                <span className="text-accent normal-case tracking-normal lowercase">(size)</span>
              </label>
              <input
                type="number" min={2} max={10000}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && ejecutar()}
                className="w-24 text-sm font-mono px-3 py-1.5 rounded-sm border border-border bg-background outline-none focus:border-primary/60 tabular-nums"
              />
            </div>
            <button
              onClick={ejecutar}
              disabled={running}
              className="px-5 py-2 text-sm font-mono rounded-sm font-semibold transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "#22d3ee", color: "#0a0a0a" }}
            >
              {running ? "Ejecutando…" : "Ejecutar benchmark"}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!data && !running && (
          <div className="surface-card p-16 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground font-mono">
                Configura el tamaño y presiona{" "}
                <span className="text-accent">"Ejecutar benchmark"</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                12 algoritmos · promedio de 6 ejecuciones · curva de escalabilidad incluida
              </p>
            </div>
          </div>
        )}

        {/* Running state */}
        {running && (
          <div className="surface-card p-16 flex items-center justify-center gap-3">
            <div className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin"/>
            <span className="text-sm font-mono text-muted-foreground">Ejecutando benchmark…</span>
          </div>
        )}

        {/* Results */}
        {data && !running && (
          <>
            <KpiCards data={data} />
            <BarChart data={data} />
            <LineChart data={data} />
            <ResultsTable data={data} />
          </>
        )}

      </main>
    </div>
  );
}
