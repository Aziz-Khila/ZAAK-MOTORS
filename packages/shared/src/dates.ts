/** Les dates sont manipulées au format "AAAA-MM-JJ" (heure locale). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Vraie date du calendrier au format AAAA-MM-JJ, entre 1900 et 2100 (refuse 2026-02-30, 2026-13-01…). */
export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (y < 1900 || y > 2100) return false;
  return toISODate(new Date(y, m - 1, d)) === s;
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(date: string, days: number): string {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Ajoute des mois en restant sur le dernier jour du mois si nécessaire (31 janv. + 1 mois = 28/29 févr.). */
export function addMonths(date: string, months: number): string {
  const d = parseISODate(date);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toISODate(target);
}

/** Date à laquelle un rappel « N jours / semaines / mois avant » se déclenche. */
export function reminderDate(date: string, value: number, unit: "jours" | "semaines" | "mois"): string {
  if (unit === "mois") return addMonths(date, -value);
  return addDays(date, -(unit === "semaines" ? value * 7 : value));
}

export function daysBetweenInclusive(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86400000) + 1;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export type PeriodPreset = "today" | "week" | "month" | "quarter" | "year" | "custom";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "quarter", label: "Ce trimestre" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Période personnalisée" },
];

export interface Period {
  from: string;
  to: string;
}

export function getPeriod(preset: PeriodPreset, ref: Date = new Date(), custom?: Partial<Period>): Period {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  switch (preset) {
    case "today":
      return { from: toISODate(ref), to: toISODate(ref) };
    case "week": {
      const dow = (ref.getDay() + 6) % 7; // lundi = 0
      const start = new Date(y, m, ref.getDate() - dow);
      const end = new Date(y, m, ref.getDate() - dow + 6);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case "month":
      return { from: toISODate(new Date(y, m, 1)), to: toISODate(new Date(y, m + 1, 0)) };
    case "quarter": {
      const q = Math.floor(m / 3) * 3;
      return { from: toISODate(new Date(y, q, 1)), to: toISODate(new Date(y, q + 3, 0)) };
    }
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
    default: {
      const month = getPeriod("month", ref);
      return { from: custom?.from || month.from, to: custom?.to || month.to };
    }
  }
}
