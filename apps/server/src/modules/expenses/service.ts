import { desc, eq } from "drizzle-orm";
import type { Charge, Revenue, chargeSchema, revenueSchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { charges, revenues } from "../../db/schema";
import { badRequest, notFound } from "../../lib/http";

type ChargeData = z.output<typeof chargeSchema>;
type RevenueData = z.output<typeof revenueSchema>;

const toCharge = ({ createdAt: _c, ...row }: typeof charges.$inferSelect): Charge => row as Charge;
const toRevenue = ({ createdAt: _c, ...row }: typeof revenues.$inferSelect): Revenue => row;

export function listCharges(kind?: string): Charge[] {
  const q = db.select().from(charges);
  return (kind ? q.where(eq(charges.kind, kind)) : q).orderBy(desc(charges.startDate), desc(charges.id)).all().map(toCharge);
}

function checkCharge(data: ChargeData) {
  if (data.endDate && data.endDate < data.startDate) throw badRequest("La date de fin doit être après la date de début.");
}

export function createCharge(data: ChargeData): Charge {
  checkCharge(data);
  return toCharge(db.insert(charges).values(data).returning().get());
}

export function updateCharge(id: number, data: ChargeData): Charge {
  checkCharge(data);
  const row = db.update(charges).set(data).where(eq(charges.id, id)).returning().get();
  if (!row) throw notFound("Charge");
  return toCharge(row);
}

export function deleteCharge(id: number) {
  db.delete(charges).where(eq(charges.id, id)).run();
}

export function listRevenues(): Revenue[] {
  return db.select().from(revenues).orderBy(desc(revenues.date), desc(revenues.id)).all().map(toRevenue);
}

export function createRevenue(data: RevenueData): Revenue {
  return toRevenue(db.insert(revenues).values(data).returning().get());
}

export function updateRevenue(id: number, data: RevenueData): Revenue {
  const row = db.update(revenues).set(data).where(eq(revenues.id, id)).returning().get();
  if (!row) throw notFound("Revenu");
  return toRevenue(row);
}

export function deleteRevenue(id: number) {
  db.delete(revenues).where(eq(revenues.id, id)).run();
}
