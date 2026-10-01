import type { FastifyInstance } from "fastify";
import { partSchema, stockAdjustSchema, stockEntrySchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import {
  adjustStock,
  createPart,
  deletePart,
  getPart,
  listMovements,
  listParts,
  stockEntry,
  updatePart,
} from "./service";

export default async function partRoutes(app: FastifyInstance) {
  app.get("/api/parts", async (req) => {
    const { q, low } = query(req);
    return listParts(q, low === "1");
  });
  app.get("/api/parts/:id", async (req) => getPart(idParam(req)));
  app.get("/api/parts/:id/movements", async (req) => listMovements(idParam(req)));
  app.post("/api/parts", async (req) => createPart(parse(partSchema, req.body)));
  app.put("/api/parts/:id", async (req) => updatePart(idParam(req), parse(partSchema, req.body)));
  app.post("/api/parts/:id/entry", async (req) => stockEntry(idParam(req), parse(stockEntrySchema, req.body)));
  app.post("/api/parts/:id/adjust", async (req) => adjustStock(idParam(req), parse(stockAdjustSchema, req.body)));
  app.delete("/api/parts/:id", async (req) => {
    deletePart(idParam(req));
    return { ok: true };
  });
}
