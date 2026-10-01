import { eq } from "drizzle-orm";
import type { GarageSettings, SettingsInput, TaxSettings } from "@garage/shared";
import { db } from "../../db/client";
import { settings } from "../../db/schema";

export function getSettings(): GarageSettings {
  const row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!row) throw new Error("Paramètres absents");
  const { id: _id, ...rest } = row;
  return rest;
}

export function updateSettings(input: Required<SettingsInput>): GarageSettings {
  db.update(settings).set(input).where(eq(settings.id, 1)).run();
  return getSettings();
}

export function taxSettings(): TaxSettings {
  const s = getSettings();
  return {
    vatEnabled: s.vatEnabled,
    vatRate: s.vatRate,
    stampEnabled: s.stampEnabled,
    stampAmount: s.stampAmount,
  };
}
