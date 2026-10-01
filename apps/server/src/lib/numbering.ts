import { and, eq, sql } from "drizzle-orm";
import { counters } from "../db/schema";
import type { Exec } from "./sql";

export const PREFIXES = {
  quote: "DV",
  invoice: "FA",
} as const;

/** Numéro séquentiel par année : DV-2026-0001, FA-2026-0001. */
export function nextNumber(exec: Exec, name: keyof typeof PREFIXES, date: string): string {
  const year = Number(date.slice(0, 4)) || new Date().getFullYear();
  const existing = exec
    .select()
    .from(counters)
    .where(and(eq(counters.name, name), eq(counters.year, year)))
    .get();
  let value: number;
  if (existing) {
    value = existing.value + 1;
    exec
      .update(counters)
      .set({ value: sql`${counters.value} + 1` })
      .where(eq(counters.id, existing.id))
      .run();
  } else {
    value = 1;
    exec.insert(counters).values({ name, year, value }).run();
  }
  return `${PREFIXES[name]}-${year}-${String(value).padStart(4, "0")}`;
}
