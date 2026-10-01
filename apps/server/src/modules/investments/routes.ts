import type { FastifyInstance } from "fastify";
import { investmentSchema } from "@garage/shared";
import { idParam, parse } from "../../lib/http";
import { createInvestment, deleteInvestment, listInvestments, updateInvestment } from "./service";

export default async function investmentRoutes(app: FastifyInstance) {
  app.get("/api/investments", async () => listInvestments());
  app.post("/api/investments", async (req) => createInvestment(parse(investmentSchema, req.body)));
  app.put("/api/investments/:id", async (req) => updateInvestment(idParam(req), parse(investmentSchema, req.body)));
  app.delete("/api/investments/:id", async (req) => {
    deleteInvestment(idParam(req));
    return { ok: true };
  });
}
