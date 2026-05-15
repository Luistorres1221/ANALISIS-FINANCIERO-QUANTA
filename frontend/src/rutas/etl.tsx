/**
 * Pagina del pipeline ETL ("/etl") — REQ 01.
 *
 * Muestra tres secciones:
 *   1. Ejecucion en tiempo real: el usuario lanza el pipeline y observa como
 *      cada uno de los 20 activos se carga uno a uno mediante SSE (Server-Sent Events).
 *   2. Pasos del pipeline: descripcion tecnica de los 4 pasos ETL (extraccion,
 *      transformacion, carga, validacion).
 *   3. Dataset unificado: tabla paginada con todas las barras OHLCV de los 20 activos.
 *   4. Mapeo de tickers: correspondencia entre simbolos internos y Yahoo Finance.
 *
 * Flujo de ejecucion SSE:
 *   - Al hacer clic en "Ejecutar ETL" se abre un EventSource a GET /etl/stream.
 *   - El backend emite eventos: "inicio", "activo" (uno por cada activo cargado) y "completo".
 *   - Cada evento "activo" actualiza el estado y muestra la tarjeta del activo como "listo".
 *   - Al recibir "completo" o si hay error, se cierra el EventSource.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity, Layers, Database, BarChart3,
  ChevronLeft, ChevronRight,
  Play, RefreshCw, CheckCircle2, XCircle, Loader2, Circle,
  Zap, AlertTriangle,
} from "lucide-react";
import { AppHeader } from "@/componentes/panel/AppHeader";
import { SectionTitle } from "@/componentes/panel/Primitives";
import { ASSETS } from "@/lib/finance-data";
import { API_BASE } from "@/lib/auth";

/** Definicion de la ruta con titulo de pestaña */
export const Route = createFileRoute("/etl")({
  component: EtlPage,
  head: () => ({ meta: [{ title: "ETL · Quanta" }] }),
});

// ── Tipos de eventos SSE ──────────────────────────────────────────────────────

/** Evento emitido por el backend por cada activo cargado exitosamente */
interface EventoActivo {
  tipo: "activo";
  ticker: string;
  nombre: string;
  mercado: string;
  sector: string;
  fuente: "YAHOO_FINANCE" | "PRNG_FALLBACK"; // Indica si los datos son reales o sinteticos
  barras: number;         // Cantidad de barras OHLCV cargadas
  ultimoCierre: number;   // Ultimo precio de cierre
  precios: number[];      // Serie de cierres para el sparkline
  progreso: number;       // Indice del activo actual (1-indexed)
  total: number;          // Total de activos a cargar (20)
}

/** Evento final emitido cuando todos los activos han sido procesados */
interface EventoCompleto {
  tipo: "completo";
  total: number;
  progreso: number;
  totalBarras: number;  // Suma de barras de todos los activos
  duracionMs: number;   // Tiempo total de ejecucion en milisegundos
  activosYahoo: number; // Cantidad descargada de Yahoo Finance
  activosPrng: number;  // Cantidad generada por PRNG (fallback)
  mensaje: string;
}

/** Estados posibles del pipeline ETL */
type EstadoEtl    = "inactivo" | "corriendo" | "completado" | "error";
/** Estados posibles de cada tarjeta de activo */
type EstadoActivo = "pendiente" | "cargando" | "listo";

/** Datos de una tarjeta de activo en la grilla */
interface DatoActivo {
  estado: EstadoActivo;
  evento?: EventoActivo; // Solo presente cuando estado === "listo"
}

// ── Orden de los 20 activos (mismo que el backend) ────────────────────────────
// El orden debe coincidir con el backend para mapear progreso a ticker correcto.

const TICKER_ORDER = [
  "ECOPETROL", "ISA",  "GEB",  "PFBCOLOM", "GRUPOSURA",
  "NUTRESA",   "CEMARGOS", "PFAVAL", "CELSIA", "EXITO",
  "VOO",  "CSPX", "QQQ",  "SPY",
  "AAPL", "MSFT", "NVDA", "TSLA", "JPM", "XOM",
];

/** Estado inicial: todos los activos en "pendiente" */
const ESTADO_INICIAL: Record<string, DatoActivo> = Object.fromEntries(
  TICKER_ORDER.map(t => [t, { estado: "pendiente" as EstadoActivo }])
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convierte milisegundos a segundos con 1 decimal. Ej: 1234 → "1.2s" */
function fmtSeg(ms: number) {
  return (ms / 1000).toFixed(1) + "s";
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

/**
 * Mini grafico de linea SVG que muestra la evolucion del precio de un activo.
 * Usa un gradiente de color verde (alza) o rojo (baja) bajo la linea.
 * Se renderiza dentro de cada tarjeta de activo cuando el estado es "listo".
 *
 * @param ticker  Simbolo del activo (se usa como ID unico del gradiente SVG)
 * @param precios Array de precios de cierre del periodo cargado
 */
function Sparkline({ ticker, precios }: { ticker: string; precios: number[] }) {
  if (precios.length < 2) return null;
  const W = 220, H = 52;
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rng = max - min || 1;
  // Funciones de escala: convierte indice/precio a coordenadas SVG
  const toX = (i: number) => (i / (precios.length - 1)) * W;
  const toY = (p: number) => H - 4 - ((p - min) / rng) * (H - 8);
  const pts  = precios.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(" ");
  // Relleno del area bajo la linea (cierra el path hasta el fondo)
  const area = `M ${precios.map((p, i) => `${toX(i).toFixed(1)},${toY(p).toFixed(1)}`).join(" L ")} L ${W},${H} L 0,${H} Z`;
  const up   = precios[precios.length - 1] >= precios[0]; // true si el activo subio en el periodo
  const col  = up ? "#4ade80" : "#f87171";
  const id   = `sp-${ticker}`; // ID unico para el gradiente SVG

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
      <defs>
        {/* Gradiente vertical del color hacia transparente */}
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={col} stopOpacity="0.25" />
          <stop offset="100%" stopColor={col} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={col} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Icono de estado ────────────────────────────────────────────────────────────

/**
 * Icono circular que indica el estado de carga de cada activo.
 * - Pendiente: circulo gris apagado
 * - Cargando: spinner animado (Loader2 con animate-spin)
 * - Listo: palomita verde (CheckCircle2)
 */
function StatusIcon({ estado }: { estado: EstadoActivo }) {
  if (estado === "pendiente") return <Circle     className="size-3 text-muted-foreground/30" />;
  if (estado === "cargando")  return <Loader2    className="size-3 text-primary animate-spin" />;
  return                              <CheckCircle2 className="size-3 text-bull" />;
}

// ── Tarjeta de activo ──────────────────────────────────────────────────────────

/**
 * Tarjeta individual de la grilla ETL que muestra el estado de un activo.
 *
 * Estados visuales:
 *   - Pendiente: borde gris, sin datos
 *   - Cargando: borde azul pulsante con animate-pulse
 *   - Listo (Yahoo): borde verde + datos + sparkline
 *   - Listo (PRNG): borde ambar + badge "PRNG Fallback" + datos
 *
 * @param ticker Simbolo del activo
 * @param dato   Estado y datos del activo
 */
function AssetCard({ ticker, dato }: { ticker: string; dato: DatoActivo }) {
  const { estado, evento } = dato;
  const listo    = estado === "listo";
  const cargando = estado === "cargando";
  const yahoo    = evento?.fuente === "YAHOO_FINANCE";

  return (
    <div
      className={[
        "rounded-md border p-3 transition-all duration-500 flex flex-col gap-1.5",
        listo    && yahoo  ? "border-bull/30 bg-bull/5"       : "",
        listo    && !yahoo ? "border-warning/30 bg-warning/5" : "",
        cargando           ? "border-primary/40 bg-primary/5 animate-pulse" : "",
        estado === "pendiente" ? "border-border/40 bg-background/30" : "",
      ].join(" ")}
    >
      {/* Fila superior: ticker + icono de estado */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold font-mono tracking-wide">{ticker}</span>
        <StatusIcon estado={estado} />
      </div>

      {estado === "pendiente" && (
        <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">
          Pendiente
        </span>
      )}

      {cargando && (
        <span className="text-[9px] font-mono text-primary/80 uppercase tracking-widest">
          Extrayendo...
        </span>
      )}

      {/* Datos del activo cuando ya esta cargado */}
      {listo && evento && (
        <>
          <div className="text-[9px] text-muted-foreground truncate leading-tight">
            {evento.nombre}
          </div>

          {/* Badge de fuente de datos */}
          <span className={[
            "self-start text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm border",
            yahoo
              ? "text-bull border-bull/30 bg-bull/10"
              : "text-amber-400 border-amber-400/30 bg-amber-400/10",
          ].join(" ")}>
            {yahoo ? "Yahoo Finance" : "PRNG Fallback"}
          </span>

          {/* Barras cargadas y ultimo precio */}
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
            <span>{evento.barras.toLocaleString()} barras</span>
            <span className="text-foreground font-semibold">
              {evento.ultimoCierre >= 100
                ? evento.ultimoCierre.toFixed(2)
                : evento.ultimoCierre.toFixed(4)}
            </span>
          </div>

          {/* Sparkline del periodo cargado */}
          {evento.precios.length > 1 && (
            <div className="-mx-0.5 mt-0.5">
              <Sparkline ticker={ticker} precios={evento.precios} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Banner de resumen exitoso ──────────────────────────────────────────────────

/**
 * Banner verde que aparece cuando el ETL completa todos los activos.
 * Muestra total de activos, barras cargadas, tiempo de ejecucion
 * y el desglose Yahoo Finance vs PRNG Fallback.
 */
function SummaryBanner({
  resumen, tiempoMs, onReintentar,
}: {
  resumen: EventoCompleto;
  tiempoMs: number;
  onReintentar: () => void;
}) {
  return (
    <div className="rounded-md border border-bull/30 bg-bull/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="size-9 rounded-md bg-bull/10 border border-bull/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="size-4 text-bull" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-bull">ETL completado</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
            {resumen.total} activos · {resumen.totalBarras?.toLocaleString()} barras ·{" "}
            {fmtSeg(tiempoMs)} de ejecucion
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0 text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-bull inline-block" />
          <span className="text-muted-foreground">{resumen.activosYahoo} Yahoo Finance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-muted-foreground">{resumen.activosPrng} PRNG Fallback</span>
        </div>
        <button
          onClick={onReintentar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="size-3" />
          Ejecutar de nuevo
        </button>
      </div>
    </div>
  );
}

// ── Banner de error ────────────────────────────────────────────────────────────

/**
 * Banner rojo que aparece cuando el SSE falla antes de recibir el evento "completo".
 * Muestra un boton para reintentar el pipeline.
 */
function ErrorBanner({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="rounded-md border border-bear/30 bg-bear/5 px-5 py-4 flex items-center gap-4">
      <div className="size-9 rounded-md bg-bear/10 border border-bear/30 flex items-center justify-center flex-shrink-0">
        <XCircle className="size-4 text-bear" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-bear">Error en el pipeline ETL</div>
        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
          El servidor no respondio o la conexion fue interrumpida.
        </div>
      </div>
      <button
        onClick={onReintentar}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-bear/40 text-bear hover:bg-bear/10 transition-colors text-xs font-mono flex-shrink-0"
      >
        <RefreshCw className="size-3" />
        Reintentar
      </button>
    </div>
  );
}

// ── Panel de ejecucion ETL en tiempo real ─────────────────────────────────────

/**
 * Componente que gestiona el ciclo de vida completo del pipeline ETL.
 *
 * Flujo de estado:
 *   inactivo → (clic Ejecutar) → corriendo → completado | error
 *
 * Internamente usa:
 *   - EventSource para la comunicacion SSE con el backend.
 *   - setInterval para actualizar el cronometro cada 100ms mientras corre.
 *   - useRef para los handles del EventSource e intervalo (no causan re-renders).
 *   - useEffect para limpiar recursos al desmontar el componente.
 */
function EtlEjecucion() {
  const [etlEstado, setEtlEstado] = useState<EstadoEtl>("inactivo");
  const [activos,   setActivos]   = useState<Record<string, DatoActivo>>(ESTADO_INICIAL);
  const [progreso,  setProgreso]  = useState(0);        // Numero de activos completados
  const [resumen,   setResumen]   = useState<EventoCompleto | null>(null);
  const [tiempoMs,  setTiempoMs]  = useState(0);        // Tiempo transcurrido en ms

  const sourceRef  = useRef<EventSource | null>(null);  // Handle del EventSource
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null); // Handle del intervalo
  const inicioRef  = useRef<number>(0);                 // Timestamp de inicio del ETL

  // Limpia el intervalo y el EventSource cuando el componente se desmonta
  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      sourceRef.current?.close();
    };
  }, []);

  /** Detiene el cronometro del ETL */
  function detenerTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  /**
   * Inicia el pipeline ETL:
   *   1. Reinicia todo el estado a los valores iniciales.
   *   2. Abre un EventSource a /api/v1/etl/stream.
   *   3. Registra listeners para los eventos "inicio", "activo" y "completo".
   *   4. Maneja errores cerrando el stream si no habia terminado.
   */
  function ejecutarEtl() {
    if (etlEstado === "corriendo") return; // Evita doble ejecucion

    // Reinicio completo del estado
    setActivos(Object.fromEntries(TICKER_ORDER.map(t => [t, { estado: "pendiente" as EstadoActivo }])));
    setProgreso(0);
    setResumen(null);
    setTiempoMs(0);
    setEtlEstado("corriendo");

    inicioRef.current = Date.now();
    // Cronometro: actualiza tiempoMs cada 100ms
    timerRef.current  = setInterval(() => setTiempoMs(Date.now() - inicioRef.current), 100);

    const source = new EventSource(`${API_BASE}/etl/stream`);
    sourceRef.current = source;
    let recibioCompleto = false; // Bandera para saber si el error es post-completo

    // Evento "inicio": marca el primer activo como "cargando"
    source.addEventListener("inicio", () => {
      setActivos(prev => ({
        ...prev,
        [TICKER_ORDER[0]]: { estado: "cargando" },
      }));
    });

    // Evento "activo": marca el activo como "listo" y el siguiente como "cargando"
    source.addEventListener("activo", (e: MessageEvent) => {
      const evento = JSON.parse(e.data) as EventoActivo;
      const siguienteTicker = TICKER_ORDER[evento.progreso]; // progreso es el indice del siguiente

      setActivos(prev => {
        const next = { ...prev };
        next[evento.ticker] = { estado: "listo", evento };
        if (siguienteTicker) next[siguienteTicker] = { estado: "cargando" };
        return next;
      });
      setProgreso(evento.progreso);
    });

    // Evento "completo": guarda el resumen y cierra el stream
    source.addEventListener("completo", (e: MessageEvent) => {
      recibioCompleto = true;
      const data = JSON.parse(e.data) as EventoCompleto;
      setResumen(data);
      detenerTimer();
      setTiempoMs(Date.now() - inicioRef.current);
      setEtlEstado("completado");
      source.close();
    });

    // Error: solo cambia a "error" si el stream fallo antes de completarse
    source.onerror = () => {
      if (!recibioCompleto) {
        setEtlEstado("error");
        detenerTimer();
      }
      source.close();
    };
  }

  const pct = progreso / 20; // Porcentaje de completado para la barra de progreso

  // ── Estado: inactivo → pantalla de bienvenida con boton ──────────────────────
  if (etlEstado === "inactivo") {
    return (
      <div className="surface-card p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="size-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <Activity className="size-6 text-primary" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="text-base font-bold">Extraccion en tiempo real</div>
          <div className="text-xs text-muted-foreground mt-1 max-w-lg">
            Ejecuta el pipeline ETL completo y observa como se carga cada uno de los
            20 activos en vivo. Los datos se descargan desde Yahoo Finance; si falla,
            se usa el generador PRNG como fallback.
          </div>
        </div>
        <button
          onClick={ejecutarEtl}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md font-mono font-semibold text-sm transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ background: "#22d3ee", color: "#0a0a0a" }}
        >
          <Play className="size-4" />
          Ejecutar ETL
        </button>
      </div>
    );
  }

  // ── Estados: corriendo / completado / error ───────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Banner de resultado (completado o error) */}
      {etlEstado === "completado" && resumen && (
        <SummaryBanner resumen={resumen} tiempoMs={tiempoMs} onReintentar={ejecutarEtl} />
      )}
      {etlEstado === "error" && (
        <ErrorBanner onReintentar={ejecutarEtl} />
      )}

      {/* Cabecera de progreso (solo mientras corre) */}
      {etlEstado === "corriendo" && (
        <div className="surface-card px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse inline-block" />
              <span className="text-sm font-semibold">ETL ejecutandose...</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {fmtSeg(tiempoMs)}
              </span>
              <span className="text-xs font-mono text-accent">
                {progreso} / 20 activos
              </span>
            </div>
          </div>

          {/* Barra de progreso proporcional al numero de activos completados */}
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct * 100}%` }}
            />
          </div>

          {/* Log en tiempo real: ultimos 8 activos cargados con color por fuente */}
          <div className="text-[10px] font-mono text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
            {TICKER_ORDER.slice(0, progreso).slice(-8).map(t => {
              const d = activos[t];
              const yahoo = d.evento?.fuente === "YAHOO_FINANCE";
              return (
                <span key={t} className={yahoo ? "text-bull" : "text-amber-400"}>
                  v {t}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Grilla de las 20 tarjetas de activos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {TICKER_ORDER.map(ticker => (
          <AssetCard key={ticker} ticker={ticker} dato={activos[ticker]} />
        ))}
      </div>

      {/* Leyenda de estados */}
      {(etlEstado === "corriendo" || etlEstado === "completado") && (
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Circle className="size-2 text-muted-foreground/40" />  Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <Loader2 className="size-2 text-primary" />  Cargando
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-bull inline-block" />  Yahoo Finance
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400 inline-block" />  PRNG Fallback
          </span>
        </div>
      )}
    </div>
  );
}

// ── Pasos del pipeline ────────────────────────────────────────────────────────

/**
 * Descripcion tecnica de los 4 pasos del pipeline ETL.
 * Cada paso tiene un icono, titulo, codigo de referencia, descripcion y lista de detalles.
 */
const PASOS = [
  {
    icon: Activity,
    title: "Extraccion",
    code: "GET /v8/finance/chart/{ticker}",
    desc: "HTTP requests explicitos a Yahoo Finance API. Sin wrappers de alto nivel. 3 reintentos con backoff lineal, timeout 20 s.",
    detalle: [
      "java.net.http.HttpClient (Java 21)",
      "Intervalo: 1d · Rango: 5y",
      "User-Agent real para evitar bloqueos",
      "Fallback PRNG mulberry32 si falla",
    ],
  },
  {
    icon: Layers,
    title: "Transformacion",
    code: "align_calendars() · interpolate()",
    desc: "Alineacion de calendarios bursatiles BVC/NYSE/NASDAQ, manejo de festivos e interpolacion lineal de valores faltantes.",
    detalle: [
      "detectarGaps() — O(n)",
      "interpolarFaltantes() — O(n+g)",
      "detectarAnomalias() — O(n)",
      "corregirAnomalias() — O(n)",
    ],
  },
  {
    icon: Database,
    title: "Carga",
    code: "ConcurrentHashMap<String, List<BarraOhlcv>>",
    desc: "Dataset maestro consolidado en memoria. Acceso O(1) por ticker. Thread-safe para peticiones concurrentes.",
    detalle: [
      "20 activos cargados en memoria",
      "~26 000 barras OHLCV totales",
      "Thread-safe con ConcurrentHashMap",
      "Semilla PRNG unica por activo",
    ],
  },
  {
    icon: BarChart3,
    title: "Validacion",
    code: "schema_check() · outlier_z()",
    desc: "Deteccion algoritmica de anomalias: cambios >50% diarios, precios negativos, incoherencia OHLC.",
    detalle: [
      "High >= Low siempre",
      "Cambio diario |D| < 50%",
      "Volumen >= 0",
      "Informe DtoInformeLimpieza por activo",
    ],
  },
];

/** Grilla de tarjetas con la descripcion tecnica de cada paso del pipeline */
function EtlPipeline() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
      {PASOS.map((p, i) => (
        <div key={p.title} className="surface-card p-4 relative">
          {/* Numero de paso en la esquina superior derecha */}
          <div className="absolute top-3 right-3 text-[10px] font-mono text-muted-foreground">
            0{i + 1}
          </div>
          <div className="size-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
            <p.icon className="size-4 text-primary" />
          </div>
          <div className="text-sm font-semibold">{p.title}</div>
          <div className="mt-1.5 text-[11px] font-mono text-accent break-all">{p.code}</div>
          <div className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.desc}</div>
          <ul className="mt-3 space-y-1">
            {p.detalle.map(d => (
              <li key={d} className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-primary/60 flex-shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Mapeo de Tickers ──────────────────────────────────────────────────────────

/** Correspondencia entre el ticker interno del sistema y el simbolo de Yahoo Finance */
const ACTIVOS_MAPEO = [
  { ticker: "ECOPETROL",  yahoo: "EC",             tipo: "NYSE ADR",    mercado: "NYSE"   },
  { ticker: "ISA",        yahoo: "ISA",            tipo: "Directo",     mercado: "NYSE"   },
  { ticker: "GEB",        yahoo: "GEB.CL",         tipo: "BVC directo", mercado: "BVC"    },
  { ticker: "PFBCOLOM",   yahoo: "CIB",            tipo: "NYSE ADR",    mercado: "NYSE"   },
  { ticker: "GRUPOSURA",  yahoo: "GRUPOSURA.CL",   tipo: "BVC directo", mercado: "BVC"    },
  { ticker: "NUTRESA",    yahoo: "NUTRESA.CL",     tipo: "BVC directo", mercado: "BVC"    },
  { ticker: "CEMARGOS",   yahoo: "CEMARGOS.CL",    tipo: "BVC directo", mercado: "BVC"    },
  { ticker: "PFAVAL",     yahoo: "AVAL",           tipo: "NYSE ADR",    mercado: "NYSE"   },
  { ticker: "CELSIA",     yahoo: "CELSIA.CL",      tipo: "BVC directo", mercado: "BVC"    },
  { ticker: "EXITO",      yahoo: "PRNG fallback",  tipo: "Sintetico",   mercado: "BVC"    },
  { ticker: "VOO",        yahoo: "VOO",            tipo: "Directo",     mercado: "NYSE"   },
  { ticker: "CSPX",       yahoo: "CSPX.L",         tipo: "Directo",     mercado: "AMEX"   },
  { ticker: "QQQ",        yahoo: "QQQ",            tipo: "Directo",     mercado: "NASDAQ" },
  { ticker: "SPY",        yahoo: "SPY",            tipo: "Directo",     mercado: "NYSE"   },
  { ticker: "AAPL",       yahoo: "AAPL",           tipo: "Directo",     mercado: "NASDAQ" },
  { ticker: "MSFT",       yahoo: "MSFT",           tipo: "Directo",     mercado: "NASDAQ" },
  { ticker: "NVDA",       yahoo: "NVDA",           tipo: "Directo",     mercado: "NASDAQ" },
  { ticker: "TSLA",       yahoo: "TSLA",           tipo: "Directo",     mercado: "NASDAQ" },
  { ticker: "JPM",        yahoo: "JPM",            tipo: "Directo",     mercado: "NYSE"   },
  { ticker: "XOM",        yahoo: "XOM",            tipo: "Directo",     mercado: "NYSE"   },
];

/** Tabla que muestra la correspondencia ticker interno ↔ simbolo Yahoo Finance */
function MapeoTickers() {
  return (
    <section>
      <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
        Mapeo de tickers · Yahoo Finance API
      </h3>
      <div className="surface-card overflow-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-muted-foreground font-normal">Ticker interno</th>
              <th className="text-left px-4 py-2.5 text-muted-foreground font-normal">Simbolo Yahoo Finance</th>
              <th className="text-left px-4 py-2.5 text-muted-foreground font-normal">Tipo</th>
              <th className="text-left px-4 py-2.5 text-muted-foreground font-normal">Mercado</th>
            </tr>
          </thead>
          <tbody>
            {ACTIVOS_MAPEO.map((a, i) => (
              <tr key={a.ticker}
                className={`border-b border-border/40 ${i % 2 === 0 ? "bg-background/30" : ""}`}>
                <td className="px-4 py-2 font-semibold">{a.ticker}</td>
                <td className={`px-4 py-2 ${a.yahoo === "PRNG fallback" ? "text-amber-400" : "text-accent"}`}>
                  {a.yahoo}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{a.tipo}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.mercado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Dataset Unificado ─────────────────────────────────────────────────────────

/** Opciones de tamanio de pagina para la tabla */
const PAGE_SIZES = [25, 50, 100];

/**
 * Tabla paginada que muestra todos los datos OHLCV de los 20 activos
 * alineados por fecha. Las columnas se agrupan por ticker con 5 sub-columnas
 * (open, high, low, close, volume).
 *
 * Implementa:
 *   - Filtro por fecha (substring matching)
 *   - Paginacion con selector de tamanio de pagina
 *   - Header doble (grupo de ticker + sub-columna)
 *   - Columna de fecha sticky (se queda fija al hacer scroll horizontal)
 */
function DatasetUnificado() {
  const [filtro,   setFiltro]   = useState("");
  const [pagina,   setPagina]   = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Construye las filas planas alineando por indice (misma longitud de serie)
  const todasLasFilas = (() => {
    const n = ASSETS[0].series.length;
    return Array.from({ length: n }, (_, i) => {
      const fila: Record<string, string | number> = { fecha: ASSETS[0].series[i].date };
      for (const a of ASSETS) {
        const b = a.series[i];
        if (b) {
          fila[`${a.ticker}_close`]  = b.close;
          fila[`${a.ticker}_high`]   = b.high;
          fila[`${a.ticker}_low`]    = b.low;
          fila[`${a.ticker}_open`]   = b.open;
          fila[`${a.ticker}_volume`] = b.volume;
        }
      }
      return fila;
    });
  })();

  // Filtra por fecha si hay texto en el campo de busqueda
  const filasFiltradas = (() => {
    const q = filtro.trim();
    return q ? todasLasFilas.filter(r => String(r.fecha).includes(q)) : todasLasFilas;
  })();

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / pageSize));
  const paginaReal   = Math.min(pagina, totalPaginas); // Evita quedar en pagina inexistente
  const filasPagina  = filasFiltradas.slice((paginaReal - 1) * pageSize, paginaReal * pageSize);

  function irAPagina(p: number) { setPagina(Math.max(1, Math.min(p, totalPaginas))); }
  function cambiarPageSize(n: number) { setPageSize(n); setPagina(1); } // Reinicia a pagina 1

  const subCols = ["close", "high", "low", "open", "volume"] as const;

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-base font-bold">Dataset unificado</h3>
        <p className="text-[11px] text-accent mt-0.5">
          Precios de cierre alineados por fecha para todos los simbolos del portafolio.
        </p>
      </div>

      <div className="surface-card overflow-hidden">
        {/* Controles: filtro + paginacion superior */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
          <input
            type="text"
            placeholder="Filtrar filas..."
            value={filtro}
            onChange={e => { setFiltro(e.target.value); setPagina(1); }}
            className="w-56 text-xs font-mono px-3 py-1.5 rounded-sm border border-border bg-background/60 placeholder:text-muted-foreground/50 outline-none focus:border-primary/60"
          />
          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span>Tamanio</span>
            <select value={pageSize} onChange={e => cambiarPageSize(Number(e.target.value))}
              className="text-xs font-mono px-2 py-1 rounded-sm border border-border bg-background outline-none">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => irAPagina(paginaReal - 1)} disabled={paginaReal === 1}
              className="p-1 rounded-sm hover:bg-secondary disabled:opacity-30">
              <ChevronLeft className="size-3.5" />
            </button>
            <span>Pagina {paginaReal} / {totalPaginas} · {filasFiltradas.length.toLocaleString()} filas</span>
            <button onClick={() => irAPagina(paginaReal + 1)} disabled={paginaReal === totalPaginas}
              className="p-1 rounded-sm hover:bg-secondary disabled:opacity-30">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Tabla con header doble sticky y columna de fecha sticky */}
        <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
          <table className="text-[11px] font-mono whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              <tr>
                {/* Columna de fecha: sticky horizontal y vertically spanning 2 rows */}
                <th className="sticky left-0 z-20 bg-background px-4 py-2 text-left text-muted-foreground font-normal border-r border-border" rowSpan={2}>
                  Fecha
                </th>
                {/* Grupos de columnas por ticker */}
                {ASSETS.map(a => (
                  <th key={a.ticker} colSpan={5}
                    className="px-2 py-1.5 text-center text-[10px] uppercase tracking-widest font-semibold border-l border-border/40">
                    {a.ticker}
                  </th>
                ))}
              </tr>
              {/* Sub-columnas OHLCV por cada ticker */}
              <tr className="border-t border-border/40">
                {ASSETS.map(a =>
                  subCols.map(col => (
                    <th key={`${a.ticker}_${col}`}
                      className="px-3 py-1 text-right text-[10px] text-muted-foreground font-normal border-l border-border/20">
                      {col}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filasPagina.map((fila, i) => (
                <tr key={String(fila.fecha)}
                  className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "bg-background/10" : ""}`}>
                  {/* Fecha sticky a la izquierda */}
                  <td className="sticky left-0 z-10 bg-background px-4 py-2 font-semibold border-r border-border text-foreground">
                    {String(fila.fecha)}
                  </td>
                  {/* Datos OHLCV de cada activo */}
                  {ASSETS.map(a =>
                    subCols.map(col => {
                      const val = fila[`${a.ticker}_${col}`];
                      return (
                        <td key={`${a.ticker}_${col}`}
                          className="px-3 py-2 text-right tabular-nums text-muted-foreground border-l border-border/20">
                          {col === "volume"
                            ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 6 })
                            : Number(val).toFixed(6)}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginacion inferior */}
        <div className="flex items-center justify-end gap-3 px-4 py-2.5 border-t border-border text-[11px] font-mono text-muted-foreground">
          <button onClick={() => irAPagina(paginaReal - 1)} disabled={paginaReal === 1}
            className="p-1 rounded-sm hover:bg-secondary disabled:opacity-30">
            <ChevronLeft className="size-3.5" />
          </button>
          <span>Pagina {paginaReal} / {totalPaginas} · {filasFiltradas.length.toLocaleString()} filas</span>
          <button onClick={() => irAPagina(paginaReal + 1)} disabled={paginaReal === totalPaginas}
            className="p-1 rounded-sm hover:bg-secondary disabled:opacity-30">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Pagina principal ──────────────────────────────────────────────────────────

/** Ensambla todas las secciones de la pagina ETL */
function EtlPage() {
  return (
    <div className="min-h-screen text-foreground">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 space-y-12">

        <SectionTitle icon={Database} num="01" title="Pipeline ETL automatizado"
          hint="Extraccion · Limpieza · Unificacion" />

        {/* Ejecucion SSE en tiempo real */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="size-4 text-accent" />
            <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              Ejecucion en tiempo real
            </h3>
          </div>
          <EtlEjecucion />
        </section>

        {/* Descripcion tecnica de los 4 pasos */}
        <section className="space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className="size-3.5" />
            Pasos del pipeline
          </h3>
          <EtlPipeline />
        </section>

        {/* Tabla OHLCV paginada */}
        <DatasetUnificado />
        {/* Mapeo de tickers internos a Yahoo Finance */}
        <MapeoTickers />
      </main>
    </div>
  );
}
