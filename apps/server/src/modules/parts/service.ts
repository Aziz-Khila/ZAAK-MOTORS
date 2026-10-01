import { eq, sql as dsql } from "drizzle-orm";
import type { Part, StockMovement, partSchema, stockAdjustSchema, stockEntrySchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { parts, stockMovements } from "../../db/schema";
import { notFound } from "../../lib/http";
import { getLines } from "../../lib/lines";
import { all, likeTerm, scalar, type Exec } from "../../lib/sql";

type PartData = z.output<typeof partSchema>;

const PART_SELECT = `SELECT id, reference, designation, brand, supplier, purchase_price AS purchasePrice,
  sale_price AS salePrice, stock, min_stock AS minStock, compatible, notes, active FROM parts`;

export function listParts(q?: string, lowOnly = false): Part[] {
  const term = q?.trim() ?? "";
  return all<Omit<Part, "active"> & { active: number }>(
    `${PART_SELECT}
     WHERE active = 1
       AND (@term = '' OR reference LIKE @like ESCAPE '\\' OR designation LIKE @like ESCAPE '\\'
            OR brand LIKE @like ESCAPE '\\' OR compatible LIKE @like ESCAPE '\\' OR supplier LIKE @like ESCAPE '\\')
       AND (@low = 0 OR (min_stock > 0 AND stock <= min_stock))
     ORDER BY designation COLLATE NOCASE`,
    { term, like: likeTerm(term), low: lowOnly ? 1 : 0 },
  ).map((p) => ({ ...p, active: Boolean(p.active) }));
}

export function lowStockParts() {
  return listParts(undefined, true).map(({ id, reference, designation, stock, minStock }) => ({
    id,
    reference,
    designation,
    stock,
    minStock,
  }));
}

export function getPart(id: number, exec: Exec = db): Part {
  const row = exec.select().from(parts).where(eq(parts.id, id)).get();
  if (!row) throw notFound("Pièce");
  const { createdAt: _c, ...part } = row;
  return part;
}

export function createPart(data: PartData): Part {
  return db.transaction((tx) => {
    const row = tx.insert(parts).values(data).returning().get();
    if (data.stock !== 0) {
      tx.insert(stockMovements)
        .values({
          partId: row.id,
          date: new Date().toISOString().slice(0, 10),
          kind: "ajustement",
          quantity: data.stock,
          unitCost: data.purchasePrice,
          notes: "Stock initial",
        })
        .run();
    }
    return getPart(row.id, tx);
  });
}

export function updatePart(id: number, data: Omit<PartData, "stock">): Part {
  getPart(id);
  const { stock: _ignored, ...rest } = data as PartData;
  db.update(parts).set(rest).where(eq(parts.id, id)).run();
  return getPart(id);
}

export function deletePart(id: number) {
  getPart(id);
  const used = scalar("SELECT COUNT(*) FROM document_lines WHERE part_id = @id", { id });
  if (used > 0) {
    // Conservée pour l'historique, mais masquée du catalogue
    db.update(parts).set({ active: false }).where(eq(parts.id, id)).run();
  } else {
    db.transaction((tx) => {
      tx.delete(stockMovements).where(eq(stockMovements.partId, id)).run();
      tx.delete(parts).where(eq(parts.id, id)).run();
    });
  }
}

/** Entrée de stock (achat) : augmente le stock et met à jour le prix d'achat. */
export function stockEntry(id: number, input: z.output<typeof stockEntrySchema>): Part {
  return db.transaction((tx) => {
    const part = getPart(id, tx);
    const unitCost = input.unitCost ?? part.purchasePrice;
    tx.update(parts)
      .set({
        stock: dsql`${parts.stock} + ${input.quantity}`,
        purchasePrice: unitCost,
        ...(input.supplier ? { supplier: input.supplier } : {}),
      })
      .where(eq(parts.id, id))
      .run();
    tx.insert(stockMovements).values({ partId: id, date: input.date, kind: "entree", quantity: input.quantity, unitCost, notes: input.notes }).run();
    return getPart(id, tx);
  });
}

export function adjustStock(id: number, input: z.output<typeof stockAdjustSchema>): Part {
  return db.transaction((tx) => {
    const part = getPart(id, tx);
    const diff = input.newStock - part.stock;
    if (diff === 0) return part;
    tx.update(parts).set({ stock: input.newStock }).where(eq(parts.id, id)).run();
    tx.insert(stockMovements)
      .values({
        partId: id,
        date: new Date().toISOString().slice(0, 10),
        kind: "ajustement",
        quantity: diff,
        unitCost: part.purchasePrice,
        notes: input.notes || "Inventaire",
      })
      .run();
    return getPart(id, tx);
  });
}

export function listMovements(partId: number): StockMovement[] {
  return all<StockMovement>(
    `SELECT m.id, m.part_id AS partId, m.date, m.kind, m.quantity, m.unit_cost AS unitCost, m.invoice_id AS invoiceId,
       f.number AS invoiceNumber, m.notes
     FROM stock_movements m LEFT JOIN invoices f ON f.id = m.invoice_id
     WHERE m.part_id = @partId ORDER BY m.date DESC, m.id DESC LIMIT 200`,
    { partId },
  );
}

/**
 * Sortie de stock à la validation d'une facture (direction -1),
 * ou retour en stock à son annulation (direction +1).
 */
export function applyInvoiceStock(tx: Exec, invoiceId: number, date: string, direction: 1 | -1) {
  const lines = getLines("invoice", invoiceId, tx).filter((l) => l.type === "piece" && l.partId);
  for (const line of lines) {
    const exists = tx.select({ id: parts.id }).from(parts).where(eq(parts.id, line.partId!)).get();
    if (!exists) continue;
    const qty = line.quantity * direction;
    tx.update(parts)
      .set({ stock: dsql`${parts.stock} + ${qty}` })
      .where(eq(parts.id, line.partId!))
      .run();
    tx.insert(stockMovements)
      .values({
        partId: line.partId!,
        date,
        kind: direction < 0 ? "sortie" : "retour",
        quantity: qty,
        unitCost: line.unitCost,
        invoiceId,
      })
      .run();
  }
}
