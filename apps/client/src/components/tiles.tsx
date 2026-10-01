import type { ReactNode } from "react";
import { cn } from "./ui";

/** Tuile de synthèse en tête de liste (icône + valeur). */
export function SummaryTile({ icon, label, value, hint, tone = "text-slate-900" }: { icon: ReactNode; label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className={cn("truncate text-xl font-bold tabular-nums", tone)}>{value}</div>
        {hint && <div className="truncate text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

/** Chiffre clé d'une fiche (client, véhicule). */
export function Kpi({ icon, label, value, tone, hint }: { icon: ReactNode; label: string; value: ReactNode; tone: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>
        {label}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums", tone)}>{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Titre de carte avec pastille d'icône et description facultative. */
export function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-bold leading-tight text-slate-800">{title}</span>
        {subtitle && <span className="mt-0.5 block text-sm font-normal text-slate-500">{subtitle}</span>}
      </span>
    </span>
  );
}

/** Ligne d'information avec icône ; « Non renseigné » si vide. */
export function InfoRow({ icon, label, value, href, mono }: { icon: ReactNode; label: string; value: ReactNode; href?: string; mono?: boolean }) {
  const content = value ? (
    href ? (
      <a href={href} className="font-medium text-blue-700 hover:underline">
        {value}
      </a>
    ) : (
      <span className={cn("font-medium text-slate-800", mono && "font-mono text-sm tracking-wide")}>{value}</span>
    )
  ) : (
    <span className="text-slate-400">Non renseigné</span>
  );
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>
      <div className="min-w-0 break-words">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        {content}
      </div>
    </div>
  );
}
