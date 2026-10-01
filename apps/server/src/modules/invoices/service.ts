import { eq, sql as dsql } from "drizzle-orm";
import { addDays, formatDate, paymentStatus, today, type InvoiceDetail, type InvoiceListItem, type Payment, type invoiceSchema, type paymentSchema } from "@garage/shared";
import type { z } from "zod";
import { db, getSqlite } from "../../db/client";
import { invoices, payments, quotes } from "../../db/schema";
import { badRequest, notFound } from "../../lib/http";
import { getLines, saveLines, totalsOf } from "../../lib/lines";
import { nextNumber, PREFIXES } from "../../lib/numbering";
import { all, get, likeTerm, type Exec } from "../../lib/sql";
import { getClient } from "../clients/service";
import { applyInvoiceStock } from "../parts/service";
import { getSettings, taxSettings } from "../settings/service";
import { assertVehicleOfClient, getVehicle } from "../vehicles/service";

type InvoiceData = z.output<typeof invoiceSchema>;
type PaymentData = z.output<typeof paymentSchema>;

const LIST_SELECT = `
  SELECT f.id, f.number, f.quote_id AS quoteId, f.client_id AS clientId,
    f.vehicle_id AS vehicleId, f.date, f.due_date AS dueDate, f.status, f.mileage, f.work_done AS workDone, f.notes,
    f.subtotal, f.vat_rate AS vatRate, f.vat, f.stamp, f.total, f.paid, f.validated_at AS validatedAt,
    f.created_at AS createdAt, c.name AS clientName, COALESCE(v.plate, '') AS plate,
    CASE WHEN f.status IN ('facturee','partielle','impayee') THEN f.total - f.paid ELSE 0 END AS remaining
  FROM invoices f
  JOIN clients c ON c.id = f.client_id
  LEFT JOIN vehicles v ON v.id = f.vehicle_id`;

export interface InvoiceFilter {
  clientId?: number;
  vehicleId?: number;
  status?: string;
  unpaid?: boolean;
  q?: string;
}

/** Passe en "Impayée" les factures dont l'échéance est dépassée. */
export function refreshOverdue() {
  getSqlite()
    .prepare(
      `UPDATE invoices SET status = 'impayee'
       WHERE status IN ('facturee','partielle') AND due_date IS NOT NULL AND due_date < @today AND paid < total`,
    )
    .run({ today: today() });
}

export function listInvoices(f: InvoiceFilter = {}): InvoiceListItem[] {
  refreshOverdue();
  const term = f.q?.trim() ?? "";
  return all<InvoiceListItem>(
    `${LIST_SELECT}
     WHERE (@clientId IS NULL OR f.client_id = @clientId)
       AND (@vehicleId IS NULL OR f.vehicle_id = @vehicleId)
       AND (@status IS NULL OR f.status = @status)
       AND (@unpaid = 0 OR (f.status IN ('facturee','partielle','impayee') AND f.paid < f.total))
       AND (@term = '' OR f.number LIKE @like ESCAPE '\\' OR c.name LIKE @like ESCAPE '\\'
            OR v.plate_norm LIKE @plateLike ESCAPE '\\')
     ORDER BY f.date DESC, f.id DESC`,
    {
      clientId: f.clientId ?? null,
      vehicleId: f.vehicleId ?? null,
      status: f.status ?? null,
      unpaid: f.unpaid ? 1 : 0,
      term,
      like: likeTerm(term),
      plateLike: likeTerm(term.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "")),
    },
  );
}

export function getInvoiceDetail(id: number): InvoiceDetail {
  refreshOverdue();
  const item = get<InvoiceListItem>(`${LIST_SELECT} WHERE f.id = @id`, { id });
  if (!item) throw notFound("Facture");
  const quote = item.quoteId ? get<{ number: string }>("SELECT number FROM quotes WHERE id = @id", { id: item.quoteId }) : undefined;
  return {
    ...item,
    lines: getLines("invoice", id),
    payments: db.select().from(payments).where(eq(payments.invoiceId, id)).all() as Payment[],
    client: getClient(item.clientId),
    vehicle: item.vehicleId ? getVehicle(item.vehicleId) : null,
    quoteNumber: quote?.number ?? null,
  };
}

function getRow(exec: Exec, id: number) {
  const row = exec.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!row) throw notFound("Facture");
  return row;
}

function checkDueDate(date: string, dueDate: string | null) {
  if (dueDate && dueDate < date) throw badRequest("L'échéance doit être après la date de la facture.");
}

export function createInvoice(input: InvoiceData): InvoiceDetail {
  const settings = getSettings();
  if (!input.quoteId) assertVehicleOfClient(input.vehicleId, input.clientId);
  checkDueDate(input.date, input.dueDate);
  const id = db.transaction((tx) => {
    let { clientId, vehicleId, lines } = input;
    if (input.quoteId) {
      const quote = tx.select().from(quotes).where(eq(quotes.id, input.quoteId)).get();
      if (!quote) throw notFound("Devis");
      clientId = quote.clientId;
      vehicleId = quote.vehicleId;
      if (lines.length === 0) lines = getLines("quote", quote.id, tx);
      if (quote.status !== "accepte") tx.update(quotes).set({ status: "accepte" }).where(eq(quotes.id, quote.id)).run();
    }
    const totals = totalsOf(lines, taxSettings());
    const row = tx
      .insert(invoices)
      .values({
        quoteId: input.quoteId,
        clientId,
        vehicleId,
        date: input.date,
        dueDate: input.dueDate ?? addDays(input.date, settings.invoiceDueDays),
        status: "brouillon",
        mileage: input.mileage,
        workDone: input.workDone,
        notes: input.notes,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vat: totals.vat,
        stamp: totals.stamp,
        total: totals.total,
      })
      .returning()
      .get();
    saveLines(tx, "invoice", row.id, lines);
    return row.id;
  });
  return getInvoiceDetail(id);
}

const emptyInvoice = (): Omit<InvoiceData, "clientId"> => ({
  vehicleId: null,
  quoteId: null,
  date: today(),
  dueDate: null,
  mileage: null,
  workDone: "",
  notes: "",
  lines: [],
});

export function createInvoiceFromQuote(quoteId: number): InvoiceDetail {
  const quote = db.select().from(quotes).where(eq(quotes.id, quoteId)).get();
  if (!quote) throw notFound("Devis");
  const existing = get<{ id: number }>("SELECT id FROM invoices WHERE quote_id = @quoteId AND status <> 'annulee'", {
    quoteId,
  });
  if (existing) return getInvoiceDetail(existing.id);
  return createInvoice({ ...emptyInvoice(), clientId: quote.clientId, quoteId });
}

export function updateInvoice(id: number, input: InvoiceData): InvoiceDetail {
  const current = getRow(db, id);
  if (current.status !== "brouillon") throw badRequest("Seules les factures en brouillon peuvent être modifiées.");
  assertVehicleOfClient(input.vehicleId, input.clientId);
  checkDueDate(input.date, input.dueDate);
  db.transaction((tx) => {
    const totals = totalsOf(input.lines, taxSettings());
    tx.update(invoices)
      .set({
        clientId: input.clientId,
        vehicleId: input.vehicleId,
        date: input.date,
        dueDate: input.dueDate,
        mileage: input.mileage,
        workDone: input.workDone,
        notes: input.notes,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vat: totals.vat,
        stamp: totals.stamp,
        total: totals.total,
      })
      .where(eq(invoices.id, id))
      .run();
    saveLines(tx, "invoice", id, input.lines);
  });
  return getInvoiceDetail(id);
}

/** Recalcule le montant payé et le statut de paiement. */
function recomputePayment(exec: Exec, id: number) {
  const row = getRow(exec, id);
  if (row.status === "brouillon" || row.status === "annulee") return;
  const paid = exec
    .select({ s: dsql<number>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .get()!.s;
  const status = paymentStatus(row.total, paid, row.dueDate, today());
  exec.update(invoices).set({ paid, status }).where(eq(invoices.id, id)).run();
}

export function validateInvoice(id: number): InvoiceDetail {
  db.transaction((tx) => {
    const row = getRow(tx, id);
    if (row.status !== "brouillon") throw badRequest("Cette facture est déjà validée.");
    const lines = getLines("invoice", id, tx);
    if (lines.length === 0) throw badRequest("Ajoutez au moins une ligne avant de valider la facture.");
    if (row.total <= 0) throw badRequest("Le montant de la facture est nul : vérifiez les quantités et les prix.");
    if (row.date > today()) throw badRequest(`Cette facture est datée du ${formatDate(row.date)} : elle ne peut pas être validée avant cette date.`);
    const later = get<{ number: string; date: string }>(`SELECT number, date FROM invoices WHERE number LIKE @prefix AND date > @date ORDER BY date DESC LIMIT 1`, {
      prefix: `${PREFIXES.invoice}-${row.date.slice(0, 4)}-%`,
      date: row.date,
    });
    if (later) {
      throw badRequest(
        `La facture ${later.number} du ${formatDate(later.date)} est déjà validée. Pour garder une numérotation chronologique, mettez à cette facture une date à partir du ${formatDate(later.date)}.`,
      );
    }
    tx.update(invoices)
      .set({
        number: nextNumber(tx, "invoice", row.date),
        status: "facturee",
        validatedAt: dsql`(datetime('now','localtime'))`,
      })
      .where(eq(invoices.id, id))
      .run();
    applyInvoiceStock(tx, id, row.date, -1);
    recomputePayment(tx, id);
  });
  return getInvoiceDetail(id);
}

export function cancelInvoice(id: number): InvoiceDetail {
  db.transaction((tx) => {
    const row = getRow(tx, id);
    if (row.status === "brouillon") throw badRequest("Une facture brouillon peut simplement être supprimée.");
    if (row.status === "annulee") throw badRequest("Cette facture est déjà annulée.");
    if (row.paid > 0) throw badRequest("Supprimez d'abord les paiements enregistrés sur cette facture.");
    tx.update(invoices).set({ status: "annulee" }).where(eq(invoices.id, id)).run();
    applyInvoiceStock(tx, id, today(), 1);
  });
  return getInvoiceDetail(id);
}

export function deleteInvoice(id: number) {
  const row = getRow(db, id);
  if (row.status !== "brouillon") throw badRequest("Seules les factures en brouillon peuvent être supprimées (sinon : annuler).");
  db.transaction((tx) => {
    saveLines(tx, "invoice", id, []);
    tx.delete(invoices).where(eq(invoices.id, id)).run();
  });
}

export function addPayment(invoiceId: number, input: PaymentData): InvoiceDetail {
  db.transaction((tx) => {
    const row = getRow(tx, invoiceId);
    if (row.status === "brouillon") throw badRequest("Validez la facture avant d'enregistrer un paiement.");
    if (row.status === "annulee") throw badRequest("Cette facture est annulée.");
    const remaining = row.total - row.paid;
    if (input.amount > remaining) throw badRequest("Le montant dépasse le reste à payer.");
    tx.insert(payments)
      .values({ ...input, invoiceId })
      .run();
    recomputePayment(tx, invoiceId);
  });
  return getInvoiceDetail(invoiceId);
}

export function deletePayment(paymentId: number): InvoiceDetail {
  const p = db.select().from(payments).where(eq(payments.id, paymentId)).get();
  if (!p) throw notFound("Paiement");
  db.transaction((tx) => {
    tx.delete(payments).where(eq(payments.id, paymentId)).run();
    recomputePayment(tx, p.invoiceId);
  });
  return getInvoiceDetail(p.invoiceId);
}
