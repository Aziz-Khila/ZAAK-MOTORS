import type { FastifyInstance } from "fastify";
import { clientSchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import { createClient, deleteClient, getClientDetail, listClients, updateClient } from "./service";

export default async function clientRoutes(app: FastifyInstance) {
  app.get("/api/clients", async (req) => listClients(query(req).q));
  app.get("/api/clients/:id", async (req) => getClientDetail(idParam(req)));
  app.post("/api/clients", async (req) => createClient(parse(clientSchema, req.body)));
  app.put("/api/clients/:id", async (req) => updateClient(idParam(req), parse(clientSchema, req.body)));
  app.delete("/api/clients/:id", async (req) => {
    deleteClient(idParam(req));
    return { ok: true };
  });
}
