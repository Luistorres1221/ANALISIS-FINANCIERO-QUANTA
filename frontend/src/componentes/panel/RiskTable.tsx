/**
 * Tabla de riesgo y patrones técnicos de los 20 activos.
 *
 * Para cada activo calcula y muestra:
 *   - σ diaria: desviación estándar de los retornos diarios
 *   - Volatilidad anualizada: σ_diaria × √252
 *   - Categoría de riesgo: Conservador / Moderado / Agresivo
 *   - Patrón ↑×3: rachas de exactamente 3 días alcistas consecutivos
 *   - Patrón ↓×3: rachas de exactamente 3 días bajistas consecutivos
 *   - Alta vol. (ventana): ventanas de 30 días con volatilidad superior al promedio histórico
 *
 * Funcionalidades:
 *   - Ordenamiento por cualquier columna (clic en encabezado → ascendente/descendente)
 *   - Filtro de texto para buscar activos por ticker
 *   - Filas alternadas para facilitar la lectura
 */
import { useMemo, useState } from "react";
import {
  ASSETS, returns, std, riskCategory,
  countUpStreaks, countDownStreaks, countHighVolWindows,
} from "@/lib/finance-data";

/** Claves válidas para ordenar la tabla */
type SortKey = "ticker" | "sigma" | "vol" | "cat" | "up3" | "down3" | "highVol";

export function RiskTable() {
  const [sort,   setSort]   = useState<SortKey>("vol");    // Columna activa de ordenamiento
  const [asc,    setAsc]    = useState(true);               // true = ascendente, false = descendente
  const [filtro, setFiltro] = useState("");                  // Texto de filtro por ticker

  /**
   * Calcula todas las métricas para los 20 activos UNA sola vez.
   * useMemo evita recalcular en cada re-render (los datos no cambian).
   */
  const rows = useMemo(() => {
    return ASSETS.map(a => {
      const rets  = returns(a.series);          // Retornos diarios de toda la serie
      const sigma = std(rets);                   // Desviación estándar diaria (σ)
      const vol   = sigma * Math.sqrt(252);      // Volatilidad anualizada = σ × √252
      return {
        ticker:  a.ticker,
        sigma,                                   // σ diaria (p.ej. 0.012 = 1.2%)
        vol,                                     // Volatilidad anualizada (p.ej. 0.19 = 19%)
        cat:     riskCategory(vol).toUpperCase() as string, // "CONSERVADOR" | "MODERADO" | "AGRESIVO"
        up3:     countUpStreaks(a.series, 3),    // Número de rachas alcistas de exactamente 3 días
        down3:   countDownStreaks(a.series, 3),  // Número de rachas bajistas de exactamente 3 días
        highVol: countHighVolWindows(a.series, 30), // Ventanas de 30 días con alta volatilidad
      };
    });
  }, []); // Sin dependencias: se calcula una vez al montar el componente

  /**
   * Filtra y ordena las filas según el estado actual.
   * Se recalcula cuando cambia el filtro, la columna de orden o la dirección.
   */
  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    // Filtra por ticker si hay texto de búsqueda
    const base = q ? rows.filter(r => r.ticker.toLowerCase().includes(q)) : rows;

    // Ordena según la columna activa y la dirección (ascendente / descendente)
    return [...base].sort((a, b) => {
      let diff = 0;
      if      (sort === "ticker")  diff = a.ticker.localeCompare(b.ticker); // Orden alfabético
      else if (sort === "sigma")   diff = a.sigma   - b.sigma;
      else if (sort === "vol")     diff = a.vol     - b.vol;
      else if (sort === "cat")     diff = a.cat.localeCompare(b.cat);
      else if (sort === "up3")     diff = a.up3     - b.up3;
      else if (sort === "down3")   diff = a.down3   - b.down3;
      else if (sort === "highVol") diff = a.highVol - b.highVol;
      return asc ? diff : -diff; // Invierte el signo para orden descendente
    });
  }, [rows, sort, asc, filtro]);

  /**
   * Maneja el clic en un encabezado de columna.
   * - Si ya es la columna activa: invierte el orden (asc ↔ desc)
   * - Si es una nueva columna: la selecciona y ordena ascendente por defecto
   */
  function handleSort(key: SortKey) {
    if (sort === key) setAsc(p => !p);      // Misma columna: invierte dirección
    else { setSort(key); setAsc(true); }    // Nueva columna: selecciona y ordena asc
  }

  /**
   * Retorna las clases CSS de color para la badge de categoría de riesgo.
   * - CONSERVADOR: verde (bajo riesgo)
   * - MODERADO: azul/primario (riesgo medio)
   * - AGRESIVO: rojo (alto riesgo)
   */
  const catCls = (c: string) =>
    c === "CONSERVADOR" ? "text-bull border-bull/40 bg-bull/10"
    : c === "MODERADO"  ? "text-primary border-primary/40 bg-primary/10"
    :                     "text-bear border-bear/40 bg-bear/10";

  return (
    <div className="surface-card overflow-hidden">
      {/* ── Encabezado de la tarjeta ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
        <div>
          <div className="text-sm font-semibold">Riesgo y patrones</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Ranking por volatilidad anualizada, clasificación y conteo de patrones en retornos.
          </div>
        </div>
        {/* Contador: filas visibles / total de activos */}
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {filtered.length} · {ASSETS.length} activos
        </span>
      </div>

      {/* ── Barra de filtro por ticker ── */}
      <div className="px-4 py-2.5 border-b border-border">
        <input
          type="text"
          placeholder="Filtrar filas..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="w-56 text-xs font-mono px-3 py-1.5 rounded-sm border border-border bg-background/60 placeholder:text-muted-foreground/50 outline-none focus:border-primary/60"
        />
      </div>

      {/* ── Tabla de datos ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-background/30">
              {/* Cada Th es interactivo: al hacer clic ordena por esa columna */}
              <Th label="Activo"              sortKey="ticker"  current={sort} asc={asc} onSort={handleSort} />
              <Th label="σ diaria"            sortKey="sigma"   current={sort} asc={asc} onSort={handleSort} right />
              <Th label="Volatilidad"         sortKey="vol"     current={sort} asc={asc} onSort={handleSort} right />
              <Th label="Riesgo"              sortKey="cat"     current={sort} asc={asc} onSort={handleSort} />
              <Th label="Patrón ↑×3"         sortKey="up3"     current={sort} asc={asc} onSort={handleSort} right />
              <Th label="Patrón ↓×3"         sortKey="down3"   current={sort} asc={asc} onSort={handleSort} right />
              <Th label="Alta vol. (ventana)" sortKey="highVol" current={sort} asc={asc} onSort={handleSort} right />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.ticker}
                className={`border-b border-border/40 hover:bg-secondary/20 transition-colors ${
                  i % 2 === 0 ? "bg-background/20" : "" // Filas alternadas para facilitar la lectura
                }`}
              >
                <td className="px-4 py-2.5 font-semibold text-foreground">{r.ticker}</td>
                {/* σ diaria: 6 decimales para mostrar precisión (p.ej. 0.012345) */}
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r.sigma.toFixed(6)}
                </td>
                {/* Volatilidad anualizada: 6 decimales */}
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {r.vol.toFixed(6)}
                </td>
                {/* Badge de categoría de riesgo con color indicativo */}
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${catCls(r.cat)}`}>
                    {r.cat}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r.up3.toFixed(6)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r.down3.toFixed(6)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r.highVol.toFixed(6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Encabezado de columna interactivo para la tabla de riesgo.
 * Muestra una flecha indicando el orden actual (↑ asc, ↓ desc, ⇅ inactivo).
 *
 * @param label    Texto del encabezado
 * @param sortKey  Clave de ordenamiento que maneja esta columna
 * @param current  Clave actualmente seleccionada (para resaltar la columna activa)
 * @param asc      Dirección actual del ordenamiento
 * @param onSort   Callback invocado al hacer clic en el encabezado
 * @param right    Si true, alinea el texto a la derecha (para columnas numéricas)
 */
function Th({
  label, sortKey, current, asc, onSort, right,
}: {
  label:   string;
  sortKey: SortKey;
  current: SortKey;
  asc:     boolean;
  onSort:  (k: SortKey) => void;
  right?:  boolean;
}) {
  const active = current === sortKey; // Esta columna está activamente ordenando
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-2.5 text-[10px] uppercase tracking-widest font-normal select-none cursor-pointer whitespace-nowrap
        ${right ? "text-right" : "text-left"}
        ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
        transition-colors`}
    >
      {label}
      {/* Indicador de dirección: ↑ ascendente, ↓ descendente, ⇅ columna inactiva */}
      <span className="ml-1 opacity-60">
        {active ? (asc ? "↑" : "↓") : "⇅"}
      </span>
    </th>
  );
}
