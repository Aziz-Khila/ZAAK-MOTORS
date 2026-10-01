import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { cn } from "./ui";

const PAGE_SIZE = 200;

/** Toutes les lignes sont chargées (les totaux restent justes) ; seul l'affichage se fait par paquets de 200. */
export function useShowMore<T>(rows: T[]) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const rest = rows.length - limit;
  return {
    visible: rest > 0 ? rows.slice(0, limit) : rows,
    more:
      rest > 0 ? (
        <div className="border-t border-slate-100 p-3 text-center">
          <button
            type="button"
            onClick={() => setLimit(limit + PAGE_SIZE)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ChevronDown className="size-4" />
            Afficher plus · {rest.toLocaleString("fr-FR")} restant{rest > 1 ? "s" : ""}
          </button>
        </div>
      ) : null,
  };
}

/** Cellules des tableaux de liste (clients, véhicules, devis, factures, pièces). */
export const listTh = "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-5";
export const listTd = "px-4 py-3.5 first:pl-5";

/** Conteneur blanc d'une liste : barre d'outils en tête, contenu dessous. */
export function ListPanel({ toolbar, children }: { toolbar?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {toolbar && <div className="space-y-3 border-b border-slate-100 p-3">{toolbar}</div>}
      {children}
    </section>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  count,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  count?: ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {value && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {count !== undefined && <span className="px-2 text-sm text-slate-500">{count}</span>}
    </div>
  );
}

/** Filtres en pastilles, avec un compteur facultatif par filtre. */
export function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number; dot?: string }[];
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors",
              active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
            )}
          >
            {o.dot && <span className={cn("size-2 rounded-full", o.dot)} />}
            {o.label}
            {o.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function RowChevron() {
  return <ChevronRight className="size-5 text-slate-300 transition-colors group-hover:text-slate-500" />;
}

/** Pastille d'icône carrée en tête de ligne ; `tone` remplace les couleurs par défaut. */
export function RowIcon({ children, tone }: { children: ReactNode; tone?: string }) {
  return <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone ?? "bg-slate-100 text-slate-500")}>{children}</span>;
}
