import type { FastifyInstance } from "fastify";
import { chargeSchema, revenueSchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import {
  createCharge,
  createRevenue,
  deleteCharge,
  deleteRevenue,
  listCharges,
  listRevenues,
  updateCharge,
  updateRevenue,
} from "./service";

export default async function expenseRoutes(app: FastifyInstance) {
  app.get("/api/charges", async (req) => listCharges(query(req).kind || undefined));
  app.post("/api/charges", async (req) => createCharge(parse(chargeSchema, req.body)));
  app.put("/api/charges/:id", async (req) => updateCharge(idParam(req), parse(chargeSchema, req.body)));
  app.delete("/api/charges/:id", async (req) => {
    deleteCharge(idParam(req));
    return { ok: true };
  });

  app.get("/api/revenues", async () => listRevenues());
  app.post("/api/revenues", async (req) => createRevenue(parse(revenueSchema, req.body)));
  app.put("/api/revenues/:id", async (req) => updateRevenue(idParam(req), parse(revenueSchema, req.body)));
  app.delete("/api/revenues/:id", async (req) => {
    deleteRevenue(idParam(req));
    return { ok: true };
  });
}
