import type { FastifyInstance } from "fastify";
import { templateSchema } from "@garage/shared";
import { idParam, parse } from "../../lib/http";
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from "./service";

export default async function serviceTemplateRoutes(app: FastifyInstance) {
  app.get("/api/templates", async () => listTemplates());
  app.post("/api/templates", async (req) => createTemplate(parse(templateSchema, req.body)));
  app.put("/api/templates/:id", async (req) => updateTemplate(idParam(req), parse(templateSchema, req.body)));
  app.delete("/api/templates/:id", async (req) => {
    deleteTemplate(idParam(req));
    return { ok: true };
  });
}
