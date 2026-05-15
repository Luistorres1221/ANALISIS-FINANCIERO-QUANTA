/**
 * Gráfico de velas japonesas (Candlestick Chart) con SMAs y volumen.
 *
 * Renderiza las barras OHLCV como velas japonesas usando SVG puro (sin recharts):
 *   - Vela verde (--bull): cierre ≥ apertura (día alcista)
 *   - Vela roja (--bear): cierre < apertura (día bajista)
 *   - Línea central (mecha): rango High-Low del día
 *   - Cuerpo (rectángulo): rango Open-Close
 *
 * Incluye:
 *   - Líneas de grid horizontales en el eje Y
 *   - SMA-20 en color primario (azul)
 *   - SMA-50 en color acento (naranja)
 *   - Banda de volumen en la parte inferior (20% del alto total)
 *   - Etiquetas de fechas en el eje X (máx. 8 etiquetas distribuidas uniformemente)
 */
import { useMemo } from "react";
import { Asset, sma } from "@/lib/finance-data";

/** Props del componente: activo a mostrar y número de días hacia atrás */
type Props = { asset: Asset; days?: number };

export function CandlestickChart({ asset, days = 90 }: Props) {
  // Toma las últimas 'days' barras para el período visible en el gráfico
  const data = asset.series.slice(-days);

  // Calcula las SMAs sobre la serie completa para que la SMA tenga suficiente historia,
  // luego corta al mismo período visible (últimos 'days' valores)
  const closes = asset.series.map(s => s.close);
  const sma20  = sma(closes, 20).slice(-days); // SMA de 20 días (corto plazo)
  const sma50  = sma(closes, 50).slice(-days); // SMA de 50 días (mediano plazo)

  // Calcula el rango de precios visible con 5% de padding para que las velas no toquen los bordes
  const { min, max } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const d of data) {
      if (d.low  < mn) mn = d.low;   // Mínimo del período: el low más bajo de todas las velas
      if (d.high > mx) mx = d.high;  // Máximo del período: el high más alto de todas las velas
    }
    const pad = (mx - mn) * 0.05; // 5% de padding para que haya margen visual arriba y abajo
    return { min: mn - pad, max: mx + pad };
  }, [data]);

  // ── Dimensiones del SVG ────────────────────────────────────────────────────
  const W  = 1000; // Ancho total del viewport SVG
  const H  = 360;  // Alto del área de precios
  const PADL = 50; // Padding izquierdo (para etiquetas del eje Y)
  const PADR = 8;  // Padding derecho
  const PADT = 12; // Padding superior
  const PADB = 28; // Padding inferior (para etiquetas del eje X)

  const innerW = W - PADL - PADR; // Ancho útil para las velas
  const innerH = H - PADT - PADB; // Alto útil para los precios

  // Ancho de cada vela (número de píxeles SVG por barra)
  const cw = innerW / data.length;

  /**
   * Convierte un precio a coordenada Y en el SVG.
   * La escala va de abajo (max precio → Y pequeño) a arriba (min precio → Y grande).
   * @param v Precio a convertir
   * @returns Coordenada Y en el viewport SVG
   */
  const y = (v: number) => PADT + (1 - (v - min) / (max - min)) * innerH;

  // ── Volumen ────────────────────────────────────────────────────────────────
  const VH     = 60; // Alto de la banda de volumen (60px debajo del gráfico de precios)
  const maxVol = Math.max(...data.map(d => d.volume)); // Volumen máximo para normalizar

  // ── Líneas de grid horizontales ────────────────────────────────────────────
  const yticks = 5; // Número de líneas de referencia horizontales
  // Calcula los valores de precio para cada línea de grid (distribuidos uniformemente)
  const yLines = Array.from({ length: yticks }, (_, i) =>
    min + (max - min) * (i / (yticks - 1))
  );

  /**
   * Construye el atributo 'd' de un <path> SVG para la línea de una SMA.
   * Usa "M" para el primer punto válido y "L" para los siguientes.
   * Salta los valores null (donde la SMA no tiene suficientes datos aún).
   */
  const smaPath = (arr: (number | null)[]) => {
    let path = "";
    arr.forEach((v, i) => {
      if (v == null) return; // Sin suficientes datos para esta posición → salta
      const x  = PADL + i * cw + cw / 2; // Centro horizontal de la barra i
      const yy = y(v);                     // Coordenada Y del valor SMA
      path += (path ? "L" : "M") + x + "," + yy + " "; // M al inicio, L para el resto
    });
    return path;
  };

  return (
    <div className="surface-card p-4">
      {/*
        SVG principal: ancho = W, alto = H (precios) + VH (volumen)
        viewBox permite que escale responsivamente con CSS
      */}
      <svg viewBox={`0 0 ${W} ${H + VH}`} className="w-full h-auto">

        {/* ── Líneas de grid y etiquetas del eje Y ── */}
        {yLines.map((v, i) => (
          <g key={i}>
            {/* Línea de referencia horizontal punteada */}
            <line
              x1={PADL} x2={W - PADR}
              y1={y(v)} y2={y(v)}
              stroke="var(--grid)" strokeDasharray="2 4"
            />
            {/* Etiqueta de precio a la izquierda de la línea */}
            <text
              x={PADL - 6} y={y(v) + 3}
              textAnchor="end" fontSize="9"
              fill="var(--muted-foreground)" fontFamily="ui-monospace"
            >
              {/* Sin decimales para precios grandes (>1000), 2 decimales para pequeños */}
              {v.toFixed(v > 1000 ? 0 : 2)}
            </text>
          </g>
        ))}

        {/* ── Velas japonesas ── */}
        {data.map((d, i) => {
          const x  = PADL + i * cw + cw / 2; // Centro X de esta vela
          const up = d.close >= d.open;        // true = día alcista (verde), false = bajista (rojo)
          const color = up ? "var(--bull)" : "var(--bear)";
          const bw = Math.max(1, cw * 0.65);  // Ancho del cuerpo = 65% del espacio por barra (mín. 1px)

          return (
            <g key={i}>
              {/* Mecha: línea vertical de High a Low */}
              <line
                x1={x} x2={x}
                y1={y(d.high)} y2={y(d.low)}
                stroke={color} strokeWidth={1}
              />
              {/* Cuerpo: rectángulo de Open a Close */}
              <rect
                x={x - bw / 2}
                y={y(Math.max(d.open, d.close))}   // El tope del cuerpo es el mayor entre open/close
                width={bw}
                height={Math.max(1, Math.abs(y(d.open) - y(d.close)))} // Mín. 1px para dojis
                fill={color}
                opacity={up ? 0.9 : 1} // Velas alcistas ligeramente transparentes para distinción visual
              />
            </g>
          );
        })}

        {/* ── Líneas de SMAs ── */}
        {/* SMA-20: línea azul (color primario) — tendencia de corto plazo */}
        <path d={smaPath(sma20)} fill="none" stroke="var(--primary)" strokeWidth={1.5} opacity={0.9} />
        {/* SMA-50: línea naranja (color acento) — tendencia de mediano plazo */}
        <path d={smaPath(sma50)} fill="none" stroke="var(--accent)"  strokeWidth={1.5} opacity={0.9} />

        {/* ── Barras de volumen (banda inferior) ── */}
        {data.map((d, i) => {
          const x  = PADL + i * cw + cw / 2;
          const up = d.close >= d.open;
          // Altura proporcional al volumen del día respecto al máximo del período
          const h  = (d.volume / maxVol) * (VH - 12);
          const bw = Math.max(1, cw * 0.65);

          return (
            <rect
              key={i}
              x={x - bw / 2}
              y={H + VH - h - 6}   // Posiciona desde el fondo de la banda de volumen
              width={bw}
              height={h}
              fill={up ? "var(--bull)" : "var(--bear)"}
              opacity={0.45} // Semitransparente para no distraer del gráfico principal
            />
          );
        })}

        {/* ── Etiquetas del eje X (fechas) ── */}
        {/* Muestra máx. 8 fechas distribuidas uniformemente a lo largo del eje */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 8) === 0)
          .map((d, i) => {
            const idx = data.indexOf(d);
            const x   = PADL + idx * cw + cw / 2;
            return (
              <text
                key={i} x={x} y={H - 8}
                textAnchor="middle" fontSize="9"
                fill="var(--muted-foreground)" fontFamily="ui-monospace"
              >
                {d.date.slice(5)} {/* Muestra solo "MM-DD" (omite el año para ahorrar espacio) */}
              </text>
            );
          })}
      </svg>

      {/* ── Leyenda ── */}
      <div className="flex items-center gap-4 mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-sm bg-bull" />Up
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-sm bg-bear" />Down
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5" style={{ background: "var(--primary)" }} />SMA 20
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5" style={{ background: "var(--accent)" }} />SMA 50
        </div>
        <div className="ml-auto">Volumen</div>
      </div>
    </div>
  );
}
