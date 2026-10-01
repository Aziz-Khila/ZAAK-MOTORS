import type { FastifyInstance } from "fastify";
import { getPeriod, isValidISODate, PERIOD_PRESETS, type PeriodPreset } from "@garage/shared";
import { badRequest, query } from "../../lib/http";
import { computeProfitability } from "./service";

const PRESETS = PERIOD_PRESETS.map((p) => p.value as string);

export function periodFromQuery(q: Record<string, string | undefined>) {
  const preset = (PRESETS.includes(q.period ?? "") ? q.period : "month") as PeriodPreset;
  if (preset === "custom" && [q.from, q.to].some((d) => d && !isValidISODate(d))) throw badRequest("Période invalide");
  const { from, to } = getPeriod(preset, new Date(), { from: q.from, to: q.to });
  return from <= to ? { from, to } : { from: to, to: from };
}

export default async function profitabilityRoutes(app: FastifyInstance) {
  app.get("/api/profitability", async (req) => {
    const { from, to } = periodFromQuery(query(req));
    return computeProfitability(from, to);
  });
}
