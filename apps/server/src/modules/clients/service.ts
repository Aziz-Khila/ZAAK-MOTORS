import { eq } from "drizzle-orm";
import { digitsOnly, type Client, type ClientDetail, type ClientListItem } from "@garage/shared";
import type { z } from "zod";
import type { clientSchema } from "@garage/shared";
import { db } from "../../db/client";
import { clients, vehicles } from "../../db/schema";
import { badRequest, notFound } from "../../lib/http";
import { all, deleteLegacyInterventions, likeTerm, scalar, type Exec } from "../../lib/sql";
import { listQuotes } from "../quotes/service";
import { listInvoices } from "../invoices/service";

type ClientData = z.output<typeof clientSchema>;

const BILLED = "('facturee','partielle','payee','impayee')";

export function listClients(q?: string): ClientListItem[] {
  const term = q?.trim() ?? "";
  const digits = digitsOnly(term);
  return all<ClientListItem>(
    `SELECT c.id, c.type, c.name, c.phone, c.phone2, c.address, c.email, c.tax_id AS taxId, c.notes, c.created_at AS createdAt,
       (SELECT COUNT(*) FROM vehicles v WHERE v.client_id = c.id) AS vehicleCount,
       (SELECT COALESCE(GROUP_CONCAT(v.plate, ', '), '') FROM vehicles v WHERE v.client_id = c.id) AS plates,
       (SELECT COALESCE(SUM(i.total - i.paid), 0) FROM invoices i WHERE i.client_id = c.id AND i.status IN ${BILLED}) AS balance
     FROM clients c
     WHERE @term = ''
        OR c.name LIKE @like ESCAPE '\\'
        OR (@digits <> '' AND c.phone_digits LIKE @digitsLike ESCAPE '\\')
        OR EXISTS (SELECT 1 FROM vehicles v WHERE v.client_id = c.id AND v.plate_norm LIKE @plateLike ESCAPE '\\')
     ORDER BY c.name COLLATE NOCASE`,
    {
      term,
      like: likeTerm(term),
      digits,
      digitsLike: likeTerm(digits),
      plateLike: likeTerm(term.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "")),
    },
  );
}

export function getClient(id: number, exec: Exec = db): Client {
  const row = exec.select().from(clients).where(eq(clients.id, id)).get();
  if (!row) throw notFound("Client");
  const { phoneDigits: _p, ...client } = row;
  return client as Client;
}

export function getClientDetail(id: number): ClientDetail {
  const client = getClient(id);
  const vehicleRows = db.select().from(vehicles).where(eq(vehicles.clientId, id)).all();
  const invoices = listInvoices({ clientId: id });
  const billed = invoices.filter((i) => ["facturee", "partielle", "payee", "impayee"].includes(i.status));
  return {
    ...client,
    vehicles: vehicleRows,
    quotes: listQuotes({ clientId: id }),
    invoices,
    balance: billed.reduce((s, i) => s + i.remaining, 0),
    totalSpent: billed.reduce((s, i) => s + i.total, 0),
  };
}

export function createClient(data: ClientData, exec: Exec = db): Client {
  const row = exec
    .insert(clients)
    .values({ ...data, phoneDigits: digitsOnly(data.phone) })
    .returning()
    .get();
  return getClient(row.id, exec);
}

export function updateClient(id: number, data: ClientData): Client {
  getClient(id);
  db.update(clients)
    .set({ ...data, phoneDigits: digitsOnly(data.phone) })
    .where(eq(clients.id, id))
    .run();
  return getClient(id);
}

export function deleteClient(id: number) {
  getClient(id);
  const used = scalar("SELECT COUNT(*) FROM quotes WHERE client_id = @id", { id }) + scalar("SELECT COUNT(*) FROM invoices WHERE client_id = @id", { id });
  if (used > 0) throw badRequest("Ce client a un historique (devis ou factures) : suppression impossible.");
  db.transaction((tx) => {
    deleteLegacyInterventions("client_id", id);
    tx.delete(vehicles).where(eq(vehicles.clientId, id)).run();
    tx.delete(clients).where(eq(clients.id, id)).run();
  });
}
