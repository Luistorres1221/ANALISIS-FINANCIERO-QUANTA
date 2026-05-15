import { useMemo, useState } from "react";
import {
  ASSETS, returns, std, annualVol, riskCategory,
  countUpStreaks, countDownStreaks, countHighVolWindows,
} from "@/lib/finance-data";

type SortKey = "ticker" | "sigma" | "vol" | "cat" | "up3" | "down3" | "highVol";

export function RiskTable() {
  const [sort, setSort]   = useState<SortKey>("vol");
  const [asc,  setAsc]    = useState(true);
  const [filtro, setFiltro] = useState("");

  const rows = useMemo(() => {
    return ASSETS.map(a => {
      const rets  = returns(a.series);
      const sigma = std(rets);
      const vol   = sigma * Math.sqrt(252);
      return {
        ticker:  a.ticker,
        sigma,
        vol,
        cat:     riskCategory(vol).toUpperCase() as string,
        up3:     countUpStreaks(a.series, 3),
        down3:   countDownStreaks(a.series, 3),
        highVol: countHighVolWindows(a.series, 30),
      };
    });
  }, []);

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = q ? rows.filter(r => r.ticker.toLowerCase().includes(q)) : rows;

    return [...base].sort((a, b) => {
      let diff = 0;
      if (sort === "ticker") diff = a.ticker.localeCompare(b.ticker);
      else if (sort === "sigma")   diff = a.sigma   - b.sigma;
      else if (sort === "vol")     diff = a.vol     - b.vol;
      else if (sort === "cat")     diff = a.cat.localeCompare(b.cat);
      else if (sort === "up3")     diff = a.up3     - b.up3;
      else if (sort === "down3")   diff = a.down3   - b.down3;
      else if (sort === "highVol") diff = a.highVol - b.highVol;
      return asc ? diff : -diff;
    });
  }, [rows, sort, asc, filtro]);

  function handleSort(key: SortKey) {
    if (sort === key) setAsc(p => !p);
    else { setSort(key); setAsc(true); }
  }

  const catCls = (c: string) =>
    c === "CONSERVADOR" ? "text-bull border-bull/40 bg-bull/10"
    : c === "MODERADO"  ? "text-primary border-primary/40 bg-primary/10"
    :                     "text-bear border-bear/40 bg-bear/10";

  return (
    <div className="surface-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
        <div>
          <div className="text-sm font-semibold">Riesgo y patrones</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Ranking por volatilidad anualizada, clasificación y conteo de patrones en retornos.
          </div>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          {filtered.length} · {ASSETS.length} activos
        </span>
      </div>

      {/* Filter */}
      <div className="px-4 py-2.5 border-b border-border">
        <input
          type="text"
          placeholder="Filtrar filas..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="w-56 text-xs font-mono px-3 py-1.5 rounded-sm border border-border bg-background/60 placeholder:text-muted-foreground/50 outline-none focus:border-primary/60"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-background/30">
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
                  i % 2 === 0 ? "bg-background/20" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-semibold text-foreground">{r.ticker}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r.sigma.toFixed(6)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {r.vol.toFixed(6)}
                </td>
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

function Th({
  label, sortKey, current, asc, onSort, right,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-2.5 text-[10px] uppercase tracking-widest font-normal select-none cursor-pointer whitespace-nowrap
        ${right ? "text-right" : "text-left"}
        ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
        transition-colors`}
    >
      {label}
      <span className="ml-1 opacity-60">
        {active ? (asc ? "↑" : "↓") : "⇅"}
      </span>
    </th>
  );
}
