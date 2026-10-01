import { eq } from "drizzle-orm";
import { addDays, type QuoteDetail, type QuoteListItem, type QuoteStatus, type quoteSchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { quotes } from "../../db/schema";
import { badRequest, notFound } from "../../lib/http";
import { getLines, saveLines, totalsOf } from "../../lib/lines";
import { nextNumber } from "../../lib/numbering";
import { all, get, likeTerm, scalar } from "../../lib/sql";
import { getClient } from "../clients/service";
import { getSettings, taxSettings } from "../settings/service";
import { assertVehicleOfClient, getVehicle } from "../vehicles/service";

type QuoteData = z.output<typeof quoteSchema>;

const LIST_SELECT = `
  SELECT q.id, q.number, q.client_id AS clientId, q.vehicle_id AS vehicleId,
    q.date, q.valid_until AS validUntil, q.status, q.notes, q.subtotal, q.vat_rate AS vatRate, q.vat, q.stamp, q.total,
    q.created_at AS createdAt, c.name AS clientName, COALESCE(v.plate, '') AS plate,
    (SELECT f.id FROM invoices f WHERE f.quote_id = q.id AND f.status <> 'annulee' LIMIT 1) AS invoiceId
  FROM quotes q
  JOIN clients c ON c.id = q.client_id
  LEFT JOIN vehicles v ON v.id = q.vehicle_id`;

export interface QuoteFilter {
  clientId?: number;
  vehicleId?: number;
  status?: string;
  q?: string;
}

export function listQuotes(f: QuoteFilter = {}): QuoteListItem[] {
  const term = f.q?.trim() ?? "";
  return all<QuoteListItem>(
    `${LIST_SELECT}
     WHERE (@clientId IS NULL OR q.client_id = @clientId)
       AND (@vehicleId IS NULL OR q.vehicle_id = @vehicleId)
       AND (@status IS NULL OR q.status = @status)
       AND (@term = '' OR q.number LIKE @like ESCAPE '\\' OR c.name LIKE @like ESCAPE '\\'
            OR v.plate_norm LIKE @plateLike ESCAPE '\\')
     ORDER BY q.date DESC, q.id DESC`,
    {
      clientId: f.clientId ?? null,
      vehicleId: f.vehicleId ?? null,
      status: f.status ?? null,
      term,
      like: likeTerm(term),
      plateLike: likeTerm(term.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "")),
    },
  );
}

export function getQuoteDetail(id: number): QuoteDetail {
  const item = get<QuoteListItem>(`${LIST_SELECT} WHERE q.id = @id`, { id });
  if (!item) throw notFound("Devis");
  return {
    ...item,
    lines: getLines("quote", id),
    client: getClient(item.clientId),
    vehicle: item.vehicleId ? getVehicle(item.vehicleId) : null,
  };
}

function checkQuote(input: QuoteData) {
  assertVehicleOfClient(input.vehicleId, input.clientId);
  if (input.validUntil && input.validUntil < input.date) throw badRequest("La date de validité doit être après la date du devis.");
}

export function createQuote(input: QuoteData): QuoteDetail {
  checkQuote(input);
  const settings = getSettings();
  const id = db.transaction((tx) => {
    const { clientId, vehicleId, lines } = input;
    const totals = totalsOf(lines, taxSettings());
    const row = tx
      .insert(quotes)
      .values({
        number: nextNumber(tx, "quote", input.date),
        clientId,
        vehicleId,
        date: input.date,
        validUntil: input.validUntil ?? addDays(input.date, settings.quoteValidityDays),
        notes: input.notes,
        status: "en_attente",
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vat: totals.vat,
        stamp: totals.stamp,
        total: totals.total,
      })
      .returning()
      .get();
    saveLines(tx, "quote", row.id, lines);
    return row.id;
  });
  return getQuoteDetail(id);
}

export function updateQuote(id: number, input: QuoteData): QuoteDetail {
  const current = getQuoteDetail(id);
  if (current.invoiceId) throw badRequest("Ce devis a déjà été facturé : modification impossible.");
  checkQuote(input);
  db.transaction((tx) => {
    const totals = totalsOf(input.lines, taxSettings());
    tx.update(quotes)
      .set({
        clientId: input.clientId,
        vehicleId: input.vehicleId,
        date: input.date,
        validUntil: input.validUntil,
        notes: input.notes,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vat: totals.vat,
        stamp: totals.stamp,
        total: totals.total,
      })
      .where(eq(quotes.id, id))
      .run();
    saveLines(tx, "quote", id, input.lines);
  });
  return getQuoteDetail(id);
}

export function setQuoteStatus(id: number, status: QuoteStatus): QuoteDetail {
  getQuoteDetail(id);
  db.update(quotes).set({ status }).where(eq(quotes.id, id)).run();
  return getQuoteDetail(id);
}

export function deleteQuote(id: number) {
  getQuoteDetail(id);
  if (scalar("SELECT COUNT(*) FROM invoices WHERE quote_id = @id", { id }) > 0) {
    throw badRequest("Ce devis est lié à une facture : suppression impossible.");
  }
  db.transaction((tx) => {
    saveLines(tx, "quote", id, []);
    tx.delete(quotes).where(eq(quotes.id, id)).run();
  });
}
