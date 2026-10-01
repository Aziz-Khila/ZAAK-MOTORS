import { desc, eq } from "drizzle-orm";
import type { Investment, investmentSchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { investments } from "../../db/schema";
import { notFound } from "../../lib/http";

type InvestmentData = z.output<typeof investmentSchema>;

const toInvestment = ({ createdAt: _c, ...row }: typeof investments.$inferSelect): Investment => row;

export function listInvestments(): Investment[] {
  return db.select().from(investments).orderBy(desc(investments.purchaseDate)).all().map(toInvestment);
}

export function createInvestment(data: InvestmentData): Investment {
  return toInvestment(db.insert(investments).values(data).returning().get());
}

export function updateInvestment(id: number, data: InvestmentData): Investment {
  const row = db.update(investments).set(data).where(eq(investments.id, id)).returning().get();
  if (!row) throw notFound("Investissement");
  return toInvestment(row);
}

export function deleteInvestment(id: number) {
  db.delete(investments).where(eq(investments.id, id)).run();
}
