import { ASSETS, ASSET_MAP, returns, fmt } from "@/lib/finance-data";
import { Activity, Radio } from "lucide-react";

export function Ticker() {
  const items = ASSETS.map(a => {
    const r = returns(a.series);
    const last = r[r.length - 1] ?? 0;
    return { t: a.ticker, p: a.series[a.series.length - 1].close, c: last };
  });
  const doubled = [...items, ...items];
  return (
    <div className="border-y border-border bg-card/50 backdrop-blur overflow-hidden">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-4 py-2.5 border-r border-border bg-card shrink-0">
          <Radio className="size-3.5 text-bull pulse-dot rounded-full" strokeWidth={3} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Live Feed</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-scroll flex gap-8 whitespace-nowrap py-2.5">
            {doubled.map((it, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-foreground font-semibold">{it.t}</span>
                <span className="text-muted-foreground">{fmt(it.p)}</span>
                <span className={it.c >= 0 ? "text-bull" : "text-bear"}>
                  {it.c >= 0 ? "▲" : "▼"} {fmt(Math.abs(it.c) * 100, 2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, delta, accent }: { label: string; value: string; delta?: string; accent?: "bull" | "bear" | "primary" | "accent" }) {
  const color = accent === "bull" ? "text-bull" : accent === "bear" ? "text-bear" : accent === "accent" ? "text-accent" : "text-primary";
  return (
    <div className="surface-card p-4 relative overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60" />
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-mono font-semibold ${color}`}>{value}</div>
      {delta && <div className="mt-1 text-xs font-mono text-muted-foreground">{delta}</div>}
    </div>
  );
}

export function SectionTitle({ icon: Icon, title, hint, num }: { icon: React.ComponentType<{ className?: string }>; title: string; hint?: string; num?: string }) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-md border border-border bg-card flex items-center justify-center">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          {num && <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">REQ {num}</div>}
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
      </div>
      {hint && <div className="text-xs font-mono text-muted-foreground hidden md:block">{hint}</div>}
    </div>
  );
}
