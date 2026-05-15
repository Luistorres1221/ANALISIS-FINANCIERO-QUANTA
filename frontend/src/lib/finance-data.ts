// Deterministic mock financial data (visualization-only demo)
export type OHLC = { date: string; open: number; high: number; low: number; close: number; volume: number };

export type Asset = {
  ticker: string;
  name: string;
  market: "BVC" | "NYSE" | "NASDAQ" | "AMEX";
  sector: string;
  series: OHLC[];
};

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSeries(seed: number, start: number, days: number, drift: number, vol: number): OHLC[] {
  const rand = mulberry32(seed);
  const out: OHLC[] = [];
  let price = start;
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const r = (rand() - 0.5) * 2;
    const change = drift + r * vol;
    const open = price;
    const close = Math.max(0.5, price * (1 + change));
    const high = Math.max(open, close) * (1 + rand() * vol * 0.5);
    const low = Math.min(open, close) * (1 - rand() * vol * 0.5);
    const volume = Math.floor(500_000 + rand() * 5_000_000);
    out.push({
      date: d.toISOString().slice(0, 10),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return out;
}

const DEFS: Array<Omit<Asset, "series"> & { seed: number; start: number; drift: number; vol: number }> = [
  { ticker: "ECOPETROL", name: "Ecopetrol S.A.", market: "BVC", sector: "Energía", seed: 11, start: 2150, drift: 0.0002, vol: 0.022 },
  { ticker: "ISA", name: "Interconexión Eléctrica", market: "BVC", sector: "Utilities", seed: 12, start: 18500, drift: 0.0003, vol: 0.018 },
  { ticker: "GEB", name: "Grupo Energía Bogotá", market: "BVC", sector: "Utilities", seed: 13, start: 2680, drift: 0.0001, vol: 0.016 },
  { ticker: "PFBCOLOM", name: "Bancolombia Pref.", market: "BVC", sector: "Financiero", seed: 14, start: 32000, drift: 0.0004, vol: 0.020 },
  { ticker: "GRUPOSURA", name: "Grupo SURA", market: "BVC", sector: "Financiero", seed: 15, start: 23800, drift: 0.0002, vol: 0.019 },
  { ticker: "NUTRESA", name: "Grupo Nutresa", market: "BVC", sector: "Consumo", seed: 16, start: 73000, drift: 0.0001, vol: 0.014 },
  { ticker: "CEMARGOS", name: "Cementos Argos", market: "BVC", sector: "Materiales", seed: 17, start: 4500, drift: 0.0002, vol: 0.024 },
  { ticker: "PFAVAL", name: "Grupo Aval Pref.", market: "BVC", sector: "Financiero", seed: 18, start: 1130, drift: 0.0001, vol: 0.017 },
  { ticker: "CELSIA", name: "Celsia S.A.", market: "BVC", sector: "Utilities", seed: 19, start: 3550, drift: 0.0003, vol: 0.020 },
  { ticker: "EXITO", name: "Almacenes Éxito", market: "BVC", sector: "Consumo", seed: 20, start: 4800, drift: -0.0001, vol: 0.025 },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", market: "AMEX", sector: "Index ETF", seed: 21, start: 410, drift: 0.0006, vol: 0.011 },
  { ticker: "CSPX", name: "iShares Core S&P 500", market: "AMEX", sector: "Index ETF", seed: 22, start: 480, drift: 0.0006, vol: 0.011 },
  { ticker: "QQQ", name: "Invesco QQQ Trust", market: "NASDAQ", sector: "Index ETF", seed: 23, start: 360, drift: 0.0008, vol: 0.015 },
  { ticker: "SPY", name: "SPDR S&P 500 ETF", market: "AMEX", sector: "Index ETF", seed: 24, start: 415, drift: 0.0006, vol: 0.011 },
  { ticker: "AAPL", name: "Apple Inc.", market: "NASDAQ", sector: "Tecnología", seed: 25, start: 165, drift: 0.0008, vol: 0.018 },
  { ticker: "MSFT", name: "Microsoft", market: "NASDAQ", sector: "Tecnología", seed: 26, start: 320, drift: 0.0009, vol: 0.016 },
  { ticker: "NVDA", name: "NVIDIA", market: "NASDAQ", sector: "Tecnología", seed: 27, start: 280, drift: 0.0018, vol: 0.032 },
  { ticker: "TSLA", name: "Tesla", market: "NASDAQ", sector: "Automotriz", seed: 28, start: 240, drift: 0.0005, vol: 0.038 },
  { ticker: "JPM", name: "JPMorgan Chase", market: "NYSE", sector: "Financiero", seed: 29, start: 145, drift: 0.0004, vol: 0.014 },
  { ticker: "XOM", name: "Exxon Mobil", market: "NYSE", sector: "Energía", seed: 30, start: 105, drift: 0.0003, vol: 0.017 },
];

export const ASSETS: Asset[] = DEFS.map(d => ({
  ticker: d.ticker, name: d.name, market: d.market, sector: d.sector,
  series: genSeries(d.seed, d.start, 1260, d.drift, d.vol), // ~5 years of trading days
}));

export const ASSET_MAP: Record<string, Asset> = Object.fromEntries(ASSETS.map(a => [a.ticker, a]));

// ============ Algorithms (explicit, no high-level libs) ============

export function returns(series: OHLC[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < series.length; i++) r.push((series[i].close - series[i - 1].close) / series[i - 1].close);
  return r;
}

export function mean(a: number[]): number { let s = 0; for (const x of a) s += x; return s / a.length; }
export function std(a: number[]): number {
  const m = mean(a); let s = 0; for (const x of a) s += (x - m) ** 2; return Math.sqrt(s / (a.length - 1));
}

// Annualized historical volatility
export function annualVol(series: OHLC[]): number { return std(returns(series)) * Math.sqrt(252); }

// CAGR
export function cagr(series: OHLC[]): number {
  const first = series[0].close, last = series[series.length - 1].close;
  const years = series.length / 252;
  return Math.pow(last / first, 1 / years) - 1;
}

// Pearson correlation
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const ma = mean(a.slice(-n)), mb = mean(b.slice(-n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[a.length - n + i] - ma;
    const y = b[b.length - n + i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return num / Math.sqrt(da * db);
}

// Euclidean distance on z-scored prices (length-aligned)
export function euclidean(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const A = a.slice(-n), B = b.slice(-n);
  const ma = mean(A), sa = std(A), mb = mean(B), sb = std(B);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const za = (A[i] - ma) / sa, zb = (B[i] - mb) / sb;
    s += (za - zb) ** 2;
  }
  return Math.sqrt(s);
}

// Cosine similarity
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[a.length - n + i], y = b[b.length - n + i];
    dot += x * y; na += x * x; nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// DTW (windowed Sakoe-Chiba band for performance)
export function dtw(a: number[], b: number[], band = 20): number {
  const n = a.length, m = b.length;
  const INF = Infinity;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  cost[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - band), jEnd = Math.min(m, i + band);
    for (let j = jStart; j <= jEnd; j++) {
      const d = Math.abs(a[i - 1] - b[j - 1]);
      cost[i][j] = d + Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
    }
  }
  return cost[n][m];
}

// Simple Moving Average
export function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(i >= window - 1 ? sum / window : null);
  }
  return out;
}

// Sliding window: count consecutive up-day streaks of length >= k
export function countUpStreaks(series: OHLC[], k: number): number {
  let count = 0, run = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].close > series[i - 1].close) { run++; if (run === k) count++; }
    else run = 0;
  }
  return count;
}

// Pattern: "V-shape" - drop > t followed by rise > t within 3 days
export function countVShapes(series: OHLC[], t = 0.02): number {
  let count = 0;
  for (let i = 3; i < series.length; i++) {
    const drop = (series[i - 2].close - series[i - 3].close) / series[i - 3].close;
    const rise = (series[i].close - series[i - 1].close) / series[i - 1].close;
    if (drop < -t && rise > t) count++;
  }
  return count;
}

export function riskCategory(vol: number): "Conservador" | "Moderado" | "Agresivo" {
  if (vol < 0.20) return "Conservador";
  if (vol < 0.35) return "Moderado";
  return "Agresivo";
}

export function fmt(n: number, d = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// Count consecutive down-day streaks of length >= k
export function countDownStreaks(series: OHLC[], k: number): number {
  let count = 0, run = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].close < series[i - 1].close) { run++; if (run === k) count++; }
    else run = 0;
  }
  return count;
}

// Count rolling windows where window realized vol exceeds overall daily std
export function countHighVolWindows(series: OHLC[], windowSize = 30): number {
  const rets = returns(series);
  const baseline = std(rets);
  let count = 0;
  for (let i = windowSize - 1; i < rets.length; i++) {
    const w = rets.slice(i - windowSize + 1, i + 1);
    if (std(w) > baseline) count++;
  }
  return count;
}
