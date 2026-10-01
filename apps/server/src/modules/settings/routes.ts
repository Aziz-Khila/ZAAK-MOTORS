import type { FastifyInstance } from "fastify";
import { settingsSchema } from "@garage/shared";
import { parse } from "../../lib/http";
import { getSettings, updateSettings } from "./service";

export default async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => getSettings());
  app.put("/api/settings", async (req) => updateSettings(parse(settingsSchema, req.body)));
}
