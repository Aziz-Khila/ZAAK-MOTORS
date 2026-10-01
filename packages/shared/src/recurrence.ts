import type { Frequency } from "./constants";
import { addMonths, parseISODate } from "./dates";

export interface RecurringAmount {
  amount: number;
  frequency: Frequency;
  startDate: string;
  endDate?: string | null;
}

const STEP_MONTHS: Record<Exclude<Frequency, "ponctuelle">, number> = {
  mensuelle: 1,
  trimestrielle: 3,
  annuelle: 12,
};

/** Dates d'échéance d'une charge comprises dans [from, to]. */
export function occurrencesInPeriod(charge: RecurringAmount, from: string, to: string): string[] {
  const last = charge.endDate && charge.endDate < to ? charge.endDate : to;
  if (charge.frequency === "ponctuelle") {
    return charge.startDate >= from && charge.startDate <= last ? [charge.startDate] : [];
  }
  const step = STEP_MONTHS[charge.frequency];
  const dates: string[] = [];
  let i = 0;
  let current = charge.startDate;
  // Saut rapide jusqu'au début de la période
  if (current < from) {
    const a = parseISODate(current);
    const b = parseISODate(from);
    const monthsDiff = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    i = Math.max(0, Math.floor(monthsDiff / step) - 1);
    current = addMonths(charge.startDate, i * step);
  }
  // Garde-fou : 300 ans d'échéances mensuelles au maximum, même avec des dates inattendues
  for (let guard = 0; current <= last && guard < 3600; guard++) {
    if (current >= from) dates.push(current);
    i += 1;
    current = addMonths(charge.startDate, i * step);
  }
  return dates;
}

export function amountInPeriod(charge: RecurringAmount, from: string, to: string): number {
  return occurrencesInPeriod(charge, from, to).length * charge.amount;
}

/** Équivalent mensuel d'une charge récurrente (pour affichage). */
export function monthlyEquivalent(charge: Pick<RecurringAmount, "amount" | "frequency">): number {
  if (charge.frequency === "ponctuelle") return 0;
  return Math.round(charge.amount / STEP_MONTHS[charge.frequency]);
}

export interface Depreciable {
  price: number;
  purchaseDate: string;
  lifetimeMonths: number | null;
}

/**
 * Amortissement linéaire compris dans [from, to] : une mensualité (prix ÷ durée) à chaque
 * date anniversaire mensuelle de l'achat, la dernière absorbant l'arrondi.
 * Sans durée, le prix entier est compté à la date d'achat.
 */
export function depreciationInPeriod(inv: Depreciable, from: string, to: string): number {
  if (inv.price <= 0) return 0;
  const months = inv.lifetimeMonths && inv.lifetimeMonths > 0 ? inv.lifetimeMonths : 1;
  const monthly = Math.round(inv.price / months);
  let total = 0;
  for (let k = 0; k < months; k++) {
    const date = addMonths(inv.purchaseDate, k);
    if (date > to) break;
    if (date >= from) total += k === months - 1 ? inv.price - monthly * (months - 1) : monthly;
  }
  return total;
}
