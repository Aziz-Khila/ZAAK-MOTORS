import { addDays, daysBetweenInclusive, parseISODate, today, type ReminderUnit } from "@garage/shared";

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Aujourd'hui », « Demain », sinon « Jeudi 8 octobre » (ou « Jeu. 8 oct. » en court). */
export function dayLabel(iso: string, short = false) {
  const now = today();
  if (iso === now) return "Aujourd'hui";
  if (iso === addDays(now, 1)) return "Demain";
  const options: Intl.DateTimeFormatOptions = short ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "long", day: "numeric", month: "long" };
  return capitalize(parseISODate(iso).toLocaleDateString("fr-FR", options));
}

/** « Aujourd'hui », « Demain », « Dans 5 jours ». */
export function untilLabel(date: string) {
  const days = daysBetweenInclusive(today(), date) - 1;
  return days <= 0 ? "Aujourd'hui" : days === 1 ? "Demain" : `Dans ${days} jours`;
}

const UNIT_WORDS: Record<ReminderUnit, [string, string]> = { jours: ["jour", "jours"], semaines: ["semaine", "semaines"], mois: ["mois", "mois"] };

/** « 1 semaine », « 3 jours », « 2 mois ». */
export const reminderDelay = (value: number, unit: ReminderUnit) => `${value} ${UNIT_WORDS[unit][value > 1 ? 1 : 0]}`;
