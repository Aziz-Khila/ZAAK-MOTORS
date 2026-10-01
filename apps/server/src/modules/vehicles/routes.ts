import type { FastifyInstance } from "fastify";
import { vehicleSchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import { createVehicle, deleteVehicle, getVehicleDetail, listVehicles, updateVehicle } from "./service";

export default async function vehicleRoutes(app: FastifyInstance) {
  app.get("/api/vehicles", async (req) => {
    const { q, clientId } = query(req);
    return listVehicles(q, clientId ? Number(clientId) : undefined);
  });
  app.get("/api/vehicles/:id", async (req) => getVehicleDetail(idParam(req)));
  app.post("/api/vehicles", async (req) => createVehicle(parse(vehicleSchema, req.body)));
  app.put("/api/vehicles/:id", async (req) => updateVehicle(idParam(req), parse(vehicleSchema, req.body)));
  app.delete("/api/vehicles/:id", async (req) => {
    deleteVehicle(idParam(req));
    return { ok: true };
  });
}
