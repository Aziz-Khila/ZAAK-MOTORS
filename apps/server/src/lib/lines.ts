import { and, asc, eq } from "drizzle-orm";
import { computeTotals, lineTotal, type Line, type LineInput, type TaxSettings } from "@garage/shared";
import { db } from "../db/client";
import { documentLines, parts } from "../db/schema";
import { badRequest } from "./http";
import type { Exec } from "./sql";

export type DocType = "quote" | "invoice" | "template";

export function getLines(docType: DocType, docId: number, exec: Exec = db): Line[] {
  return exec
    .select()
    .from(documentLines)
    .where(and(eq(documentLines.docType, docType), eq(documentLines.docId, docId)))
    .orderBy(asc(documentLines.position), asc(documentLines.id))
    .all()
    .map((l) => ({
      id: l.id,
      type: l.type as Line["type"],
      designation: l.designation,
      reference: l.reference,
      partId: l.partId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      unitCost: l.unitCost,
      total: l.total,
    }));
}

/** Remplace toutes les lignes d'un document. */
export function saveLines(exec: Exec, docType: DocType, docId: number, lines: (LineInput | Line)[]) {
  for (const l of lines) {
    if (l.partId && !exec.select({ id: parts.id }).from(parts).where(eq(parts.id, l.partId)).get()) {
      throw badRequest(`La pièce de la ligne « ${l.designation} » n'existe plus dans le catalogue.`);
    }
  }
  exec
    .delete(documentLines)
    .where(and(eq(documentLines.docType, docType), eq(documentLines.docId, docId)))
    .run();
  lines.forEach((l, position) => {
    exec
      .insert(documentLines)
      .values({
        docType,
        docId,
        position,
        type: l.type,
        designation: l.designation,
        reference: l.reference ?? "",
        partId: l.partId ?? null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        unitCost: l.type === "main_oeuvre" ? 0 : (l.unitCost ?? 0),
        total: lineTotal(l),
      })
      .run();
  });
}

export function totalsOf(lines: (LineInput | Line)[], tax: TaxSettings) {
  return computeTotals(
    lines.map((l) => ({ type: l.type, quantity: l.quantity, unitPrice: l.unitPrice, unitCost: l.unitCost ?? 0 })),
    tax,
  );
}
