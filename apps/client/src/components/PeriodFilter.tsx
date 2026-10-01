import { useSearchParams } from "react-router";
import { formatDate, getPeriod, PERIOD_PRESETS, type PeriodPreset } from "@garage/shared";
import { cn, Input } from "./ui";

/** Filtre de période conservé dans l'adresse (?period=month&from=…&to=…). */
export function usePeriod() {
  const [params, setParams] = useSearchParams();
  const preset = (params.get("period") as PeriodPreset) || "month";
  const custom = { from: params.get("from") ?? undefined, to: params.get("to") ?? undefined };
  const period = getPeriod(preset, new Date(), custom);
  const query = preset === "custom" ? `period=custom&from=${period.from}&to=${period.to}` : `period=${preset}`;
  const set = (p: PeriodPreset, from?: string, to?: string) => {
    const next = new URLSearchParams(params);
    next.set("period", p);
    if (p === "custom") {
      next.set("from", from ?? period.from);
      next.set("to", to ?? period.to);
    } else {
      next.delete("from");
      next.delete("to");
    }
    setParams(next, { replace: true });
  };
  return { preset, period, query, set };
}

export function PeriodFilter() {
  const { preset, period, set } = usePeriod();
  return (
    <div className="no-print mb-5 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1">
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => set(p.value)}
            className={cn(
              "h-10 rounded-lg px-3 text-sm font-semibold transition md:px-4",
              preset === p.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex items-center gap-2">
          <Input type="date" value={period.from} onChange={(e) => set("custom", e.target.value, period.to)} className="w-44" />
          <span className="text-slate-500">au</span>
          <Input type="date" value={period.to} onChange={(e) => set("custom", period.from, e.target.value)} className="w-44" />
        </div>
      ) : (
        <span className="text-sm text-slate-500">
          du {formatDate(period.from)} au {formatDate(period.to)}
        </span>
      )}
    </div>
  );
}
