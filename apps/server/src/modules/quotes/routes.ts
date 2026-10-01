import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { QUOTE_STATUS_VALUES, quoteSchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import { createQuote, deleteQuote, getQuoteDetail, listQuotes, setQuoteStatus, updateQuote } from "./service";

const quoteStatusSchema = z.object({ status: z.enum(QUOTE_STATUS_VALUES) });

export default async function quoteRoutes(app: FastifyInstance) {
  app.get("/api/quotes", async (req) => {
    const { q, status, clientId, vehicleId } = query(req);
    return listQuotes({
      q,
      status: status || undefined,
      clientId: clientId ? Number(clientId) : undefined,
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
    });
  });
  app.get("/api/quotes/:id", async (req) => getQuoteDetail(idParam(req)));
  app.post("/api/quotes", async (req) => createQuote(parse(quoteSchema, req.body)));
  app.put("/api/quotes/:id", async (req) => updateQuote(idParam(req), parse(quoteSchema, req.body)));
  app.patch("/api/quotes/:id/status", async (req) =>
    setQuoteStatus(idParam(req), parse(quoteStatusSchema, req.body).status),
  );
  app.delete("/api/quotes/:id", async (req) => {
    deleteQuote(idParam(req));
    return { ok: true };
  });
}
