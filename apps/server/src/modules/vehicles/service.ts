import { and, eq, ne } from "drizzle-orm";
import { normalizePlate, type ReplacedPart, type Vehicle, type VehicleDetail, type VehicleListItem, type vehicleSchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { clients, vehicles } from "../../db/schema";
import { badRequest, notFound } from "../../lib/http";
import { all, deleteLegacyInterventions, likeTerm, scalar, type Exec } from "../../lib/sql";
import { getClient } from "../clients/service";
import { listInvoices } from "../invoices/service";
import { listQuotes } from "../quotes/service";

type VehicleData = z.output<typeof vehicleSchema>;

export function listVehicles(q?: string, clientId?: number): VehicleListItem[] {
  const term = q?.trim() ?? "";
  return all<VehicleListItem>(
    `SELECT v.id, v.client_id AS clientId, v.plate, v.plate_norm AS plateNorm, v.brand, v.model, v.year, v.vin, v.mileage,
       v.fuel, v.notes, v.created_at AS createdAt, c.name AS clientName, c.phone AS clientPhone
     FROM vehicles v JOIN clients c ON c.id = v.client_id
     WHERE (@clientId IS NULL OR v.client_id = @clientId)
       AND (@term = ''
         OR v.plate_norm LIKE @plateLike ESCAPE '\\'
         OR v.vin LIKE @like ESCAPE '\\'
         OR (v.brand || ' ' || v.model) LIKE @like ESCAPE '\\'
         OR c.name LIKE @like ESCAPE '\\')
     ORDER BY CASE WHEN v.plate_norm = @plateNorm THEN 0 WHEN v.plate_norm LIKE @platePrefix ESCAPE '\\' THEN 1 ELSE 2 END, v.plate`,
    {
      term,
      clientId: clientId ?? null,
      like: likeTerm(term),
      plateNorm: normalizePlate(term),
      plateLike: likeTerm(normalizePlate(term)),
      platePrefix: `${normalizePlate(term).replace(/[\\%_]/g, "\\$&")}%`,
    },
  );
}

export function getVehicle(id: number, exec: Exec = db): Vehicle {
  const row = exec.select().from(vehicles).where(eq(vehicles.id, id)).get();
  if (!row) throw notFound("Véhicule");
  return row;
}

export function getVehicleDetail(id: number): VehicleDetail {
  const vehicle = getVehicle(id);
  const invoices = listInvoices({ vehicleId: id });
  const replacedParts = all<ReplacedPart>(
    `SELECT i.date, i.mileage, l.designation, l.reference, l.quantity, i.number AS invoiceNumber
     FROM document_lines l JOIN invoices i ON l.doc_type = 'invoice' AND l.doc_id = i.id
     WHERE i.vehicle_id = @id AND l.type = 'piece' AND i.status IN ('facturee','partielle','payee','impayee')
     ORDER BY i.date DESC, l.position`,
    { id },
  );
  return {
    ...vehicle,
    client: getClient(vehicle.clientId),
    quotes: listQuotes({ vehicleId: id }),
    invoices,
    replacedParts,
    totalSpent: invoices.filter((i) => ["facturee", "partielle", "payee", "impayee"].includes(i.status)).reduce((s, i) => s + i.total, 0),
  };
}

/** Le client doit exister et le véhicule choisi doit lui appartenir. */
export function assertVehicleOfClient(vehicleId: number | null, clientId: number | null, exec: Exec = db) {
  if (clientId) getClient(clientId, exec);
  if (!vehicleId) return;
  const vehicle = getVehicle(vehicleId, exec);
  if (clientId && vehicle.clientId !== clientId) throw badRequest("Ce véhicule appartient à un autre client.");
}

function assertUniquePlate(exec: Exec, plateNorm: string, exceptId?: number) {
  const other = exec
    .select({ id: vehicles.id, name: clients.name })
    .from(vehicles)
    .innerJoin(clients, eq(clients.id, vehicles.clientId))
    .where(exceptId ? and(eq(vehicles.plateNorm, plateNorm), ne(vehicles.id, exceptId)) : eq(vehicles.plateNorm, plateNorm))
    .get();
  if (other) throw badRequest(`Cette immatriculation existe déjà (client : ${other.name}).`);
}

export function createVehicle(data: VehicleData, exec: Exec = db): Vehicle {
  const plateNorm = normalizePlate(data.plate);
  if (!plateNorm) throw badRequest("Immatriculation invalide");
  assertUniquePlate(exec, plateNorm);
  getClient(data.clientId, exec);
  const row = exec
    .insert(vehicles)
    .values({ ...data, plate: data.plate.toUpperCase(), plateNorm })
    .returning()
    .get();
  return row;
}

export function updateVehicle(id: number, data: VehicleData): Vehicle {
  getVehicle(id);
  const plateNorm = normalizePlate(data.plate);
  if (!plateNorm) throw badRequest("Immatriculation invalide");
  assertUniquePlate(db, plateNorm, id);
  db.update(vehicles)
    .set({ ...data, plate: data.plate.toUpperCase(), plateNorm })
    .where(eq(vehicles.id, id))
    .run();
  return getVehicle(id);
}

export function deleteVehicle(id: number) {
  getVehicle(id);
  const used = scalar("SELECT COUNT(*) FROM quotes WHERE vehicle_id = @id", { id }) + scalar("SELECT COUNT(*) FROM invoices WHERE vehicle_id = @id", { id });
  if (used > 0) throw badRequest("Ce véhicule a un historique : suppression impossible.");
  db.transaction((tx) => {
    deleteLegacyInterventions("vehicle_id", id);
    tx.delete(vehicles).where(eq(vehicles.id, id)).run();
  });
}
