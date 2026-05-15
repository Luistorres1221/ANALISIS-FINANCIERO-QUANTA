/**
 * Mapa de calor de correlacion de Pearson entre los 20 activos.
 *
 * Construye una matriz 20x20 donde cada celda [i][j] contiene
 * el coeficiente de Pearson entre los retornos diarios del activo i y el activo j.
 * La diagonal principal siempre vale 1.0 (correlacion perfecta de un activo consigo mismo).
 *
 * Escala de color OKLCH:
 *   -1.0  →  rojo intenso  (movimientos completamente opuestos)
 *    0.0  →  gris apagado  (sin relacion lineal)
 *   +1.0  →  verde intenso (movimientos completamente sincronizados)
 *
 * Interactividad:
 *   - Hover sobre una celda: scale-110 (efecto de zoom suave via CSS)
 *   - title en cada celda: muestra "TickerA ↔ TickerB: valor" al pasar el mouse
 */
import { useMemo } from "react";
import { ASSETS, returns, pearson } from "@/lib/finance-data";

export function CorrelationHeatmap() {
  /**
   * Calcula la matriz de correlacion una sola vez al montar el componente.
   * rs[i] = array de retornos diarios del activo i.
   * matrix[i][j] = pearson(rs[i], rs[j]) → valor en [-1, 1].
   */
  const matrix = useMemo(() => {
    const rs = ASSETS.map(a => returns(a.series)); // Retornos de cada activo
    return ASSETS.map((_, i) => ASSETS.map((_, j) => pearson(rs[i], rs[j])));
  }, []); // Sin dependencias: los datos no cambian durante la sesion

  /**
   * Convierte un coeficiente de Pearson a un color OKLCH con opacidad variable.
   * La intensidad del color aumenta conforme el valor se aleja de 0.
   * Se usan dos ramas: positivos (verde, hue 145) y negativos (rojo, hue 25).
   *
   * @param v Coeficiente de Pearson en [-1, 1]
   * @returns String CSS oklch(...) listo para usar en style
   */
  const colorFor = (v: number) => {
    if (v >= 0) {
      const a = v;
      // Luminosidad de 0.30 (muy oscuro) a 0.74 (luminoso), saturacion 0.04 a 0.19
      return `oklch(${0.30 + a * 0.44} ${0.04 + a * 0.15} 145 / ${0.25 + a * 0.75})`;
    } else {
      const a = -v; // Trabaja con el valor absoluto del negativo
      return `oklch(${0.30 + a * 0.36} ${0.04 + a * 0.18} 25 / ${0.25 + a * 0.75})`;
    }
  };

  return (
    <div className="surface-card p-4 overflow-x-auto">
      <div className="inline-block min-w-full">
        <table className="border-separate border-spacing-[2px]">
          <thead>
            <tr>
              {/* Celda vacia de esquina (alinea las etiquetas de filas y columnas) */}
              <th className="w-20" />
              {/* Encabezados de columna: tickers rotados -60deg para ahorrar espacio horizontal */}
              {ASSETS.map(a => (
                <th key={a.ticker} className="text-[9px] font-mono text-muted-foreground p-1 align-bottom">
                  <div className="rotate-[-60deg] origin-bottom-left translate-x-2 whitespace-nowrap">{a.ticker}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((row, i) => (
              <tr key={row.ticker}>
                {/* Etiqueta de fila (ticker) alineada a la derecha */}
                <td className="text-[10px] font-mono text-muted-foreground pr-2 text-right">{row.ticker}</td>

                {/* Celdas de la matriz: color segun coeficiente, tooltip con valor exacto */}
                {ASSETS.map((col, j) => {
                  const v = matrix[i][j];
                  return (
                    <td
                      key={col.ticker}
                      title={`${row.ticker} ↔ ${col.ticker}: ${v.toFixed(3)}`}
                      className="size-7 text-[9px] font-mono text-center align-middle rounded-sm transition-transform hover:scale-110 hover:z-10 cursor-default"
                      style={{ background: colorFor(v) }}
                    >
                      {/* Texto mas claro si la correlacion es alta (|v| > 0.55) para contraste */}
                      <span className={Math.abs(v) > 0.55 ? "text-foreground" : "text-foreground/60"}>
                        {v.toFixed(2).replace("0.", ".").replace("-.", "-.")}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda: gradiente continuo de -1 (rojo) a +1 (verde) */}
      <div className="flex items-center gap-3 mt-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>-1</span>
        <div className="h-2 w-48 rounded-sm" style={{
          background: "linear-gradient(to right, oklch(0.66 0.22 25), oklch(0.30 0.02 250), oklch(0.74 0.19 145))"
        }} />
        <span>+1</span>
        <span className="ml-auto">Pearson · retornos diarios · 5Y</span>
      </div>
    </div>
  );
}
