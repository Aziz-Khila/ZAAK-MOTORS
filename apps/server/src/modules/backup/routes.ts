import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { today } from "@garage/shared";
import { badRequest } from "../../lib/http";
import { BACKUP_DIR, backupTo, exportBackup, listBackups, restoreBackup } from "./service";

export default async function backupRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer", bodyLimit: 1024 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  );

  app.get("/api/backup", async () => ({ folder: BACKUP_DIR, files: listBackups() }));

  app.post("/api/backup/now", async () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    await backupTo(path.join(BACKUP_DIR, `manuelle-${stamp}.db`));
    return { ok: true };
  });

  app.get("/api/backup/export", async (_req, reply) => {
    const file = await exportBackup();
    const stream = fs.createReadStream(file);
    stream.on("close", () => fs.rmSync(file, { force: true }));
    return reply
      .header("Content-Type", "application/octet-stream")
      .header("Content-Disposition", `attachment; filename="garage-sauvegarde-${today()}.db"`)
      .send(stream);
  });

  app.post("/api/backup/restore", async (req) => {
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) throw badRequest("Fichier de sauvegarde manquant");
    await restoreBackup(body);
    return { ok: true };
  });
}
