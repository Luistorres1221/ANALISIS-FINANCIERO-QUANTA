import { useMemo } from "react";
import { Asset, sma } from "@/lib/finance-data";

type Props = { asset: Asset; days?: number };

export function CandlestickChart({ asset, days = 90 }: Props) {
  const data = asset.series.slice(-days);
  const closes = asset.series.map(s => s.close);
  const sma20 = sma(closes, 20).slice(-days);
  const sma50 = sma(closes, 50).slice(-days);

  const { min, max } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const d of data) { if (d.low < mn) mn = d.low; if (d.high > mx) mx = d.high; }
    const pad = (mx - mn) * 0.05;
    return { min: mn - pad, max: mx + pad };
  }, [data]);

  const W = 1000, H = 360, PADL = 50, PADR = 8, PADT = 12, PADB = 28;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const cw = innerW / data.length;
  const y = (v: number) => PADT + (1 - (v - min) / (max - min)) * innerH;

  // Volume chart band (bottom 20%)
  const VH = 60;
  const maxVol = Math.max(...data.map(d => d.volume));

  const yticks = 5;
  const yLines = Array.from({ length: yticks }, (_, i) => min + (max - min) * (i / (yticks - 1)));

  const smaPath = (arr: (number | null)[]) => {
    let path = "";
    arr.forEach((v, i) => {
      if (v == null) return;
      const x = PADL + i * cw + cw / 2;
      const yy = y(v);
      path += (path ? "L" : "M") + x + "," + yy + " ";
    });
    return path;
  };

  return (
    <div className="surface-card p-4">
      <svg viewBox={`0 0 ${W} ${H + VH}`} className="w-full h-auto">
        {/* grid */}
        {yLines.map((v, i) => (
          <g key={i}>
            <line x1={PADL} x2={W - PADR} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeDasharray="2 4" />
            <text x={PADL - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)" fontFamily="ui-monospace">
              {v.toFixed(v > 1000 ? 0 : 2)}
            </text>
          </g>
        ))}

        {/* candles */}
        {data.map((d, i) => {
          const x = PADL + i * cw + cw / 2;
          const up = d.close >= d.open;
          const color = up ? "var(--bull)" : "var(--bear)";
          const bw = Math.max(1, cw * 0.65);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} stroke={color} strokeWidth={1} />
              <rect
                x={x - bw / 2}
                y={y(Math.max(d.open, d.close))}
                width={bw}
                height={Math.max(1, Math.abs(y(d.open) - y(d.close)))}
                fill={color}
                opacity={up ? 0.9 : 1}
              />
            </g>
          );
        })}

        {/* SMAs */}
        <path d={smaPath(sma20)} fill="none" stroke="var(--primary)" strokeWidth={1.5} opacity={0.9} />
        <path d={smaPath(sma50)} fill="none" stroke="var(--accent)" strokeWidth={1.5} opacity={0.9} />

        {/* Volume */}
        {data.map((d, i) => {
          const x = PADL + i * cw + cw / 2;
          const up = d.close >= d.open;
          const h = (d.volume / maxVol) * (VH - 12);
          const bw = Math.max(1, cw * 0.65);
          return <rect key={i} x={x - bw / 2} y={H + VH - h - 6} width={bw} height={h} fill={up ? "var(--bull)" : "var(--bear)"} opacity={0.45} />;
        })}

        {/* x-axis labels (sparse) */}
        {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d, i) => {
          const idx = data.indexOf(d);
          const x = PADL + idx * cw + cw / 2;
          return (
            <text key={i} x={x} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" fontFamily="ui-monospace">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-sm bg-bull" />Up</div>
        <div className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-sm bg-bear" />Down</div>
        <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: "var(--primary)" }} />SMA 20</div>
        <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: "var(--accent)" }} />SMA 50</div>
        <div className="ml-auto">Volumen</div>
      </div>
    </div>
  );
}
