import { useMemo } from "react";
import { ASSETS, returns, pearson } from "@/lib/finance-data";

export function CorrelationHeatmap() {
  const matrix = useMemo(() => {
    const rs = ASSETS.map(a => returns(a.series));
    return ASSETS.map((_, i) => ASSETS.map((_, j) => pearson(rs[i], rs[j])));
  }, []);

  const colorFor = (v: number) => {
    // -1 -> bear red, 0 -> muted, +1 -> bull green
    if (v >= 0) {
      const a = v;
      return `oklch(${0.30 + a * 0.44} ${0.04 + a * 0.15} 145 / ${0.25 + a * 0.75})`;
    } else {
      const a = -v;
      return `oklch(${0.30 + a * 0.36} ${0.04 + a * 0.18} 25 / ${0.25 + a * 0.75})`;
    }
  };

  return (
    <div className="surface-card p-4 overflow-x-auto">
      <div className="inline-block min-w-full">
        <table className="border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th className="w-20" />
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
                <td className="text-[10px] font-mono text-muted-foreground pr-2 text-right">{row.ticker}</td>
                {ASSETS.map((col, j) => {
                  const v = matrix[i][j];
                  return (
                    <td
                      key={col.ticker}
                      title={`${row.ticker} ↔ ${col.ticker}: ${v.toFixed(3)}`}
                      className="size-7 text-[9px] font-mono text-center align-middle rounded-sm transition-transform hover:scale-110 hover:z-10 cursor-default"
                      style={{ background: colorFor(v) }}
                    >
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
      <div className="flex items-center gap-3 mt-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>−1</span>
        <div className="h-2 w-48 rounded-sm" style={{
          background: "linear-gradient(to right, oklch(0.66 0.22 25), oklch(0.30 0.02 250), oklch(0.74 0.19 145))"
        }} />
        <span>+1</span>
        <span className="ml-auto">Pearson · retornos diarios · 5Y</span>
      </div>
    </div>
  );
}
