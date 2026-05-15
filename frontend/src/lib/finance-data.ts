/**
 * Módulo de datos financieros del frontend.
 *
 * Genera series históricas OHLCV deterministas usando el algoritmo PRNG mulberry32
 * e implementa todos los algoritmos de análisis financiero en TypeScript puro,
 * sin librerías de alto nivel. Los mismos algoritmos están duplicados en el backend
 * Java para garantizar resultados idénticos en ambos entornos.
 *
 * Los datos son sintéticos (no datos de mercado reales) — útiles para demostración.
 */

// Representa una barra de precios para un día de negociación
export type OHLC = {
  date:   string;  // Fecha en formato "YYYY-MM-DD" (ISO 8601)
  open:   number;  // Precio de apertura del día
  high:   number;  // Precio máximo del día
  low:    number;  // Precio mínimo del día
  close:  number;  // Precio de cierre del día
  volume: number;  // Volumen de unidades negociadas
};

// Representa un activo financiero con sus metadatos y su serie histórica completa
export type Asset = {
  ticker: string;                              // Símbolo bursátil (p.ej. "AAPL", "ECOPETROL")
  name:   string;                              // Nombre completo de la empresa o fondo
  market: "BVC" | "NYSE" | "NASDAQ" | "AMEX"; // Bolsa donde cotiza
  sector: string;                              // Sector económico (p.ej. "Tecnología", "Energía")
  series: OHLC[];                              // Serie de barras OHLCV en orden cronológico
};

/**
 * Implementación del generador de números pseudoaleatorios mulberry32.
 *
 * Retorna una función closure que, cada vez que se llama, genera el siguiente
 * número en la secuencia pseudoaleatoria [0.0, 1.0).
 *
 * La misma semilla siempre produce la misma secuencia, garantizando que
 * frontend y backend generen exactamente los mismos precios para cada activo.
 *
 * @param a Semilla inicial (número entero de 32 bits)
 * @returns Función que retorna el siguiente número pseudoaleatorio en [0.0, 1.0)
 */
function mulberry32(a: number) {
  return function () {
    a |= 0;                                      // Fuerza entero de 32 bits (equivale a int32)
    a = (a + 0x6D2B79F5) | 0;                   // Avanza el estado con la constante mágica
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);       // Primera mezcla de bits
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);  // Segunda mezcla de bits
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // Convierte a double en [0, 1)
  };
}

/**
 * Genera una serie histórica OHLCV usando el modelo de precios estocástico.
 *
 * Modelo de precios:
 *   precio_nuevo = precio_anterior × (1 + drift + aleatorio × volatilidad)
 * donde:
 *   - drift: tendencia diaria media (positivo = alcista)
 *   - aleatorio: número en [-1, 1] del PRNG
 *   - volatilidad: magnitud de las oscilaciones diarias
 *
 * Los fines de semana se omiten (sábado = 6, domingo = 0 en getDay()).
 *
 * @param seed  Semilla del PRNG — única por activo para reproducibilidad
 * @param start Precio inicial de la serie
 * @param days  Ventana histórica en días de calendario (~1260 = 5 años bursátiles)
 * @param drift Tendencia diaria media (p.ej. 0.0003 = +0.03%/día)
 * @param vol   Volatilidad diaria (p.ej. 0.018 = 1.8% de oscilación diaria)
 * @returns Serie de barras OHLCV en orden cronológico ascendente (sin fines de semana)
 */
function genSeries(seed: number, start: number, days: number, drift: number, vol: number): OHLC[] {
  const rand  = mulberry32(seed);  // Inicializa el PRNG con la semilla del activo
  const out: OHLC[] = [];
  let price = start;               // Precio actual — se actualiza barra a barra
  const today = new Date();

  // Itera desde 'days' atrás hasta hoy generando una barra por día hábil
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Omite sábados (6) y domingos (0) — los mercados no operan esos días
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    // Número aleatorio en [-1, 1] para la variación del día
    const r = (rand() - 0.5) * 2;

    // Cambio porcentual del día = tendencia + componente aleatoria
    const change = drift + r * vol;

    const open  = price;
    const close = Math.max(0.5, price * (1 + change)); // Mínimo 0.5 para evitar precios negativos

    // High y Low: ligeras extensiones por encima y debajo del rango Open-Close
    const high   = Math.max(open, close) * (1 + rand() * vol * 0.5);
    const low    = Math.min(open, close) * (1 - rand() * vol * 0.5);

    // Volumen: entre 500,000 y 5,500,000 unidades (distribución uniforme)
    const volume = Math.floor(500_000 + rand() * 5_000_000);

    out.push({
      date:   d.toISOString().slice(0, 10), // Formato "YYYY-MM-DD"
      open:   +open.toFixed(2),
      high:   +high.toFixed(2),
      low:    +low.toFixed(2),
      close:  +close.toFixed(2),
      volume,
    });

    // El cierre de hoy es la apertura de mañana
    price = close;
  }
  return out;
}

/**
 * Definición de los 20 activos con sus parámetros PRNG calibrados.
 * Las semillas y parámetros son idénticos a los del backend para garantizar
 * que frontend y backend generen exactamente las mismas series.
 *
 * Grupos:
 *   - seeds 11-20: BVC (Bolsa de Valores de Colombia)
 *   - seeds 21-24: ETFs internacionales (S&P 500, QQQ)
 *   - seeds 25-30: Acciones EE.UU. (AAPL, MSFT, NVDA, TSLA, JPM, XOM)
 */
const DEFS: Array<Omit<Asset, "series"> & { seed: number; start: number; drift: number; vol: number }> = [
  // ── BVC — Colombia ─────────────────────────────────────────────────────────
  { ticker: "ECOPETROL", name: "Ecopetrol S.A.",           market: "BVC",    sector: "Energía",    seed: 11, start: 2150,  drift:  0.0002, vol: 0.022 },
  { ticker: "ISA",       name: "Interconexión Eléctrica",  market: "BVC",    sector: "Utilities",  seed: 12, start: 18500, drift:  0.0003, vol: 0.018 },
  { ticker: "GEB",       name: "Grupo Energía Bogotá",     market: "BVC",    sector: "Utilities",  seed: 13, start: 2680,  drift:  0.0001, vol: 0.016 },
  { ticker: "PFBCOLOM",  name: "Bancolombia Pref.",         market: "BVC",    sector: "Financiero", seed: 14, start: 32000, drift:  0.0004, vol: 0.020 },
  { ticker: "GRUPOSURA", name: "Grupo SURA",               market: "BVC",    sector: "Financiero", seed: 15, start: 23800, drift:  0.0002, vol: 0.019 },
  { ticker: "NUTRESA",   name: "Grupo Nutresa",            market: "BVC",    sector: "Consumo",    seed: 16, start: 73000, drift:  0.0001, vol: 0.014 },
  { ticker: "CEMARGOS",  name: "Cementos Argos",           market: "BVC",    sector: "Materiales", seed: 17, start: 4500,  drift:  0.0002, vol: 0.024 },
  { ticker: "PFAVAL",    name: "Grupo Aval Pref.",         market: "BVC",    sector: "Financiero", seed: 18, start: 1130,  drift:  0.0001, vol: 0.017 },
  { ticker: "CELSIA",    name: "Celsia S.A.",              market: "BVC",    sector: "Utilities",  seed: 19, start: 3550,  drift:  0.0003, vol: 0.020 },
  { ticker: "EXITO",     name: "Almacenes Éxito",          market: "BVC",    sector: "Consumo",    seed: 20, start: 4800,  drift: -0.0001, vol: 0.025 },
  // ── ETFs internacionales ────────────────────────────────────────────────────
  { ticker: "VOO",       name: "Vanguard S&P 500 ETF",     market: "AMEX",   sector: "Index ETF",  seed: 21, start: 410,   drift:  0.0006, vol: 0.011 },
  { ticker: "CSPX",      name: "iShares Core S&P 500",     market: "AMEX",   sector: "Index ETF",  seed: 22, start: 480,   drift:  0.0006, vol: 0.011 },
  { ticker: "QQQ",       name: "Invesco QQQ Trust",        market: "NASDAQ", sector: "Index ETF",  seed: 23, start: 360,   drift:  0.0008, vol: 0.015 },
  { ticker: "SPY",       name: "SPDR S&P 500 ETF",         market: "AMEX",   sector: "Index ETF",  seed: 24, start: 415,   drift:  0.0006, vol: 0.011 },
  // ── Tecnología y Finanzas — EE.UU. ─────────────────────────────────────────
  { ticker: "AAPL",      name: "Apple Inc.",               market: "NASDAQ", sector: "Tecnología", seed: 25, start: 165,   drift:  0.0008, vol: 0.018 },
  { ticker: "MSFT",      name: "Microsoft",                market: "NASDAQ", sector: "Tecnología", seed: 26, start: 320,   drift:  0.0009, vol: 0.016 },
  { ticker: "NVDA",      name: "NVIDIA",                   market: "NASDAQ", sector: "Tecnología", seed: 27, start: 280,   drift:  0.0018, vol: 0.032 },
  { ticker: "TSLA",      name: "Tesla",                    market: "NASDAQ", sector: "Automotriz", seed: 28, start: 240,   drift:  0.0005, vol: 0.038 },
  { ticker: "JPM",       name: "JPMorgan Chase",           market: "NYSE",   sector: "Financiero", seed: 29, start: 145,   drift:  0.0004, vol: 0.014 },
  { ticker: "XOM",       name: "Exxon Mobil",              market: "NYSE",   sector: "Energía",    seed: 30, start: 105,   drift:  0.0003, vol: 0.017 },
];

/** Lista de los 20 activos con sus series OHLCV generadas (~901 barras cada uno) */
export const ASSETS: Asset[] = DEFS.map(d => ({
  ticker: d.ticker, name: d.name, market: d.market, sector: d.sector,
  series: genSeries(d.seed, d.start, 1260, d.drift, d.vol), // ~5 años de días hábiles
}));

/** Mapa ticker → Asset para búsquedas O(1) sin recorrer el array */
export const ASSET_MAP: Record<string, Asset> = Object.fromEntries(ASSETS.map(a => [a.ticker, a]));

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITMOS FINANCIEROS — implementados explícitamente sin librerías externas
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula los retornos simples diarios de una serie OHLCV.
 * Fórmula: r_t = (close_t - close_{t-1}) / close_{t-1}
 * El array resultante tiene longitud = series.length - 1.
 */
export function returns(series: OHLC[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < series.length; i++)
    r.push((series[i].close - series[i - 1].close) / series[i - 1].close);
  return r;
}

/** Calcula la media aritmética de un array de números */
export function mean(a: number[]): number {
  let s = 0;
  for (const x of a) s += x;
  return s / a.length;
}

/**
 * Calcula la desviación estándar muestral (divisor n-1, corrección de Bessel).
 * Produce una estimación insesgada de la volatilidad de la población.
 */
export function std(a: number[]): number {
  const m = mean(a);
  let s = 0;
  for (const x of a) s += (x - m) ** 2;
  return Math.sqrt(s / (a.length - 1));
}

/**
 * Calcula la volatilidad histórica anualizada.
 * Fórmula: σ_anual = σ_diaria × √252
 * (252 = días hábiles en un año bursátil típico)
 */
export function annualVol(series: OHLC[]): number {
  return std(returns(series)) * Math.sqrt(252);
}

/**
 * Calcula el CAGR (Compound Annual Growth Rate) — Tasa de Crecimiento Anual Compuesta.
 * Fórmula: CAGR = (precioFinal / precioInicial)^(1/años) - 1
 * Responde: "¿a qué tasa anual constante creció el activo desde el inicio de la serie?"
 */
export function cagr(series: OHLC[]): number {
  const first = series[0].close;
  const last  = series[series.length - 1].close;
  const years = series.length / 252; // Convierte barras a años bursátiles
  return Math.pow(last / first, 1 / years) - 1;
}

/**
 * Calcula la Correlación de Pearson entre dos series de retornos.
 * Mide la relación lineal: +1 = perfectamente correladas, 0 = independientes, -1 = inversas.
 * Si las series tienen distinta longitud, alinea por el extremo más reciente.
 */
export function pearson(a: number[], b: number[]): number {
  const n  = Math.min(a.length, b.length); // Longitud mínima para alinear las series
  const ma = mean(a.slice(-n)), mb = mean(b.slice(-n)); // Medias de las últimas n observaciones
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[a.length - n + i] - ma; // Desviación de A respecto a su media
    const y = b[b.length - n + i] - mb; // Desviación de B respecto a su media
    num += x * y;  // Covarianza acumulada (numerador de Pearson)
    da  += x * x;  // Suma de cuadrados de A (denominador parcial)
    db  += y * y;  // Suma de cuadrados de B (denominador parcial)
  }
  return num / Math.sqrt(da * db); // Pearson = covarianza / (σA × σB)
}

/**
 * Calcula la Distancia Euclidiana entre dos series de precios normalizados.
 * Aplica z-score a cada serie antes de calcular la distancia para que la comparación
 * sea independiente de la escala de precios (un activo puede costar $100 y otro $50,000).
 * z-score: z_i = (x_i - media) / desviación_estándar
 */
export function euclidean(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  const A = a.slice(-n), B = b.slice(-n);
  const ma = mean(A), sa = std(A); // Estadísticas de A para normalización
  const mb = mean(B), sb = std(B); // Estadísticas de B para normalización
  let s = 0;
  for (let i = 0; i < n; i++) {
    const za = (A[i] - ma) / sa; // z-score de A en posición i
    const zb = (B[i] - mb) / sb; // z-score de B en posición i
    s += (za - zb) ** 2;          // Suma de cuadrados de las diferencias
  }
  return Math.sqrt(s); // Raíz de la suma = distancia euclidiana
}

/**
 * Calcula la Similitud Coseno entre dos vectores de precios.
 * Mide el ángulo entre los vectores: 1.0 = misma dirección, 0 = perpendiculares.
 * Fórmula: cos(A, B) = (A·B) / (||A|| × ||B||)
 */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[a.length - n + i]; // Precio de A alineado desde el final
    const y = b[b.length - n + i]; // Precio de B alineado desde el final
    dot += x * y; // Producto punto A·B
    na  += x * x; // Suma de cuadrados de A (para la norma ||A||)
    nb  += y * y; // Suma de cuadrados de B (para la norma ||B||)
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb)); // Coseno = producto punto / producto de normas
}

/**
 * Calcula la distancia DTW (Dynamic Time Warping) con banda Sakoe-Chiba.
 *
 * DTW permite alinear dos series temporales con desfases temporales pequeños,
 * usando programación dinámica para encontrar el camino de menor costo.
 * La banda Sakoe-Chiba limita el desfase a 'band' días para mejorar el rendimiento.
 *
 * @param a    Array de precios del activo A
 * @param b    Array de precios del activo B
 * @param band Ancho máximo del desfase permitido (default 20 días)
 * @returns Distancia DTW (0 = idénticas, mayor = más diferentes)
 */
export function dtw(a: number[], b: number[], band = 20): number {
  const n = a.length, m = b.length;
  const INF = Infinity;
  // Tabla de costos acumulados: (n+1)×(m+1) inicializada con infinito
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  cost[0][0] = 0; // Punto de partida con costo cero

  for (let i = 1; i <= n; i++) {
    // Solo procesa celdas dentro de la banda Sakoe-Chiba (restricción de desfase)
    const jStart = Math.max(1, i - band);
    const jEnd   = Math.min(m, i + band);
    for (let j = jStart; j <= jEnd; j++) {
      const d = Math.abs(a[i - 1] - b[j - 1]); // Costo local: diferencia absoluta de precios
      // Costo acumulado: toma el mínimo de arriba, izquierda o diagonal + costo local
      cost[i][j] = d + Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
    }
  }
  return cost[n][m]; // Distancia total en la esquina inferior derecha
}

/**
 * Calcula la Media Móvil Simple (SMA) con suma deslizante (O(n) en lugar de O(n×W)).
 * Retorna null para las primeras (window-1) posiciones donde no hay suficientes datos.
 * @param window Tamaño de la ventana (p.ej. 20 = SMA-20, 50 = SMA-50)
 */
export function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];                          // Suma el nuevo elemento
    if (i >= window) sum -= values[i - window]; // Resta el elemento que sale de la ventana
    out.push(i >= window - 1 ? sum / window : null); // SMA o null si no hay suficientes datos
  }
  return out;
}

/**
 * Cuenta las rachas alcistas consecutivas de exactamente k días.
 * Una "racha" es k días seguidos donde el precio de cierre aumentó respecto al día anterior.
 */
export function countUpStreaks(series: OHLC[], k: number): number {
  let count = 0, run = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].close > series[i - 1].close) {
      run++; // La racha continúa
      if (run === k) count++; // Alcanzó exactamente k días
    } else {
      run = 0; // La racha se interrumpió
    }
  }
  return count;
}

/**
 * Detecta patrones "V-shape": caída brusca seguida de recuperación rápida.
 * Un patrón V ocurre cuando el precio cae más del umbral t en un día,
 * y luego sube más del umbral t en un día posterior dentro de 3 días.
 * @param t Umbral de cambio relativo (default 0.02 = 2%)
 */
export function countVShapes(series: OHLC[], t = 0.02): number {
  let count = 0;
  for (let i = 3; i < series.length; i++) {
    // Retorno del día de caída (día i-2 vs i-3)
    const drop = (series[i - 2].close - series[i - 3].close) / series[i - 3].close;
    // Retorno del día de recuperación (día i vs i-1)
    const rise = (series[i].close - series[i - 1].close) / series[i - 1].close;
    if (drop < -t && rise > t) count++; // Ambas condiciones: caída Y recuperación superan el umbral
  }
  return count;
}

/**
 * Clasifica el perfil de riesgo del activo según su volatilidad anualizada.
 * - Conservador: σ_anual < 20% (bonos, ETFs de renta fija)
 * - Moderado: 20% ≤ σ_anual < 35% (acciones blue chip, ETFs amplios)
 * - Agresivo: σ_anual ≥ 35% (acciones individuales de alta volatilidad)
 */
export function riskCategory(vol: number): "Conservador" | "Moderado" | "Agresivo" {
  if (vol < 0.20) return "Conservador";
  if (vol < 0.35) return "Moderado";
  return "Agresivo";
}

/**
 * Formatea un número con separadores de miles y decimales fijos.
 * Ejemplos: fmt(32150.75) → "32,150.75" | fmt(0.1523, 4) → "0.1523"
 * @param d Cantidad de decimales (default 2)
 */
export function fmt(n: number, d = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/**
 * Cuenta las rachas bajistas consecutivas de exactamente k días.
 * Análogo a countUpStreaks pero para días donde el precio bajó consecutivamente.
 */
export function countDownStreaks(series: OHLC[], k: number): number {
  let count = 0, run = 0;
  for (let i = 1; i < series.length; i++) {
    if (series[i].close < series[i - 1].close) {
      run++;
      if (run === k) count++;
    } else {
      run = 0;
    }
  }
  return count;
}

/**
 * Cuenta las ventanas deslizantes donde la volatilidad realizada supera la volatilidad base.
 *
 * Para cada ventana de 'windowSize' días, calcula la desviación estándar de los retornos
 * en esa ventana. Si supera la desviación estándar global de toda la serie (baseline),
 * se cuenta como una "ventana de alta volatilidad".
 *
 * Útil para detectar períodos de turbulencia o estrés de mercado.
 *
 * @param windowSize Tamaño de la ventana deslizante en días (default 30)
 * @returns Número de ventanas donde la volatilidad superó el nivel base
 */
export function countHighVolWindows(series: OHLC[], windowSize = 30): number {
  const rets     = returns(series);
  const baseline = std(rets); // Desviación estándar global de toda la serie
  let count = 0;
  for (let i = windowSize - 1; i < rets.length; i++) {
    const w = rets.slice(i - windowSize + 1, i + 1); // Ventana deslizante de retornos
    if (std(w) > baseline) count++; // La ventana es más volátil que el promedio histórico
  }
  return count;
}
