import { asc, eq } from "drizzle-orm";
import type { Line, ServiceTemplate, templateSchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { parts, serviceTemplates } from "../../db/schema";
import { notFound } from "../../lib/http";
import { getLines, saveLines } from "../../lib/lines";
import { getSettings } from "../settings/service";

type TemplateData = z.output<typeof templateSchema>;

/**
 * Les prix sont rafraîchis au moment de l'utilisation :
 * main-d'œuvre sans prix = taux horaire du garage, pièces liées = prix actuels de la fiche pièce.
 */
function refreshLine(line: Line, hourlyRate: number, partPrices: Map<number, { sale: number; cost: number }>): Line {
  if (line.type === "main_oeuvre" && !line.unitPrice) return { ...line, unitPrice: hourlyRate };
  if (line.partId && partPrices.has(line.partId)) {
    const p = partPrices.get(line.partId)!;
    return { ...line, unitPrice: p.sale, unitCost: p.cost };
  }
  return line;
}

export function listTemplates(): ServiceTemplate[] {
  const { hourlyRate } = getSettings();
  const partPrices = new Map(
    db
      .select({ id: parts.id, sale: parts.salePrice, cost: parts.purchasePrice })
      .from(parts)
      .all()
      .map((p) => [p.id, { sale: p.sale, cost: p.cost }]),
  );
  return db
    .select()
    .from(serviceTemplates)
    .orderBy(asc(serviceTemplates.name))
    .all()
    .map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      notes: t.notes,
      lines: getLines("template", t.id).map((l) => refreshLine(l, hourlyRate, partPrices)),
    }));
}

function getTemplate(id: number): ServiceTemplate {
  const t = listTemplates().find((x) => x.id === id);
  if (!t) throw notFound("Prestation");
  return t;
}

export function createTemplate(data: TemplateData): ServiceTemplate {
  const id = db.transaction((tx) => {
    const row = tx
      .insert(serviceTemplates)
      .values({ name: data.name, category: data.category, notes: data.notes })
      .returning()
      .get();
    saveLines(tx, "template", row.id, data.lines);
    return row.id;
  });
  return getTemplate(id);
}

export function updateTemplate(id: number, data: TemplateData): ServiceTemplate {
  getTemplate(id);
  db.transaction((tx) => {
    tx.update(serviceTemplates)
      .set({ name: data.name, category: data.category, notes: data.notes })
      .where(eq(serviceTemplates.id, id))
      .run();
    saveLines(tx, "template", id, data.lines);
  });
  return getTemplate(id);
}

export function deleteTemplate(id: number) {
  getTemplate(id);
  db.transaction((tx) => {
    saveLines(tx, "template", id, []);
    tx.delete(serviceTemplates).where(eq(serviceTemplates.id, id)).run();
  });
}
