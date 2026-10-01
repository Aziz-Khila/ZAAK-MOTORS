import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError, badRequest, parse } from "../../lib/http";
import { getSettings } from "../settings/service";
import { isUnlocked, pinEnabled, savePin, sessionToken, setSessionCookie, verifyPin } from "./service";

const unlockSchema = z.object({ pin: z.string().trim() });
const pinSchema = z.object({
  currentPin: z.string().trim().default(""),
  newPin: z.string().trim().nullable(),
});

export default async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/status", async (req) => ({
    enabled: pinEnabled(),
    unlocked: isUnlocked(req),
    garageName: getSettings().garageName,
  }));

  app.post("/api/auth/unlock", async (req, reply) => {
    const { pin } = parse(unlockSchema, req.body);
    if (!verifyPin(pin)) throw badRequest("Code incorrect");
    setSessionCookie(reply, sessionToken());
    return { ok: true };
  });

  app.post("/api/auth/lock", async (_req, reply) => {
    setSessionCookie(reply, null);
    return { ok: true };
  });

  /** Activer, changer ou supprimer le code (le code actuel est demandé s'il existe). */
  app.put("/api/auth/pin", async (req, reply) => {
    const { currentPin, newPin } = parse(pinSchema, req.body);
    if (pinEnabled()) {
      if (!isUnlocked(req)) throw new HttpError(401, "Logiciel verrouillé : saisissez le code.");
      if (!verifyPin(currentPin)) throw badRequest("Code actuel incorrect");
    }
    savePin(newPin);
    setSessionCookie(reply, sessionToken());
    return { enabled: pinEnabled() };
  });
}
