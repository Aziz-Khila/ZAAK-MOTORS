import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { DATA_DIR } from "../../db/client";
import { HttpError, badRequest } from "../../lib/http";

/** Code PIN facultatif. Code oublié : supprimer ce fichier sur le PC désactive le code. */
const PIN_FILE = path.join(DATA_DIR, "pin.json");
const SESSION_COOKIE = "garage_session";

const MAX_FAILURES = 5;
const LOCKOUT_MS = 30_000;

interface PinFile {
  salt: string;
  hash: string;
  /** Change à chaque nouveau code : les appareils déjà déverrouillés doivent ressaisir le code. */
  secret: string;
}

function readPinFile(): PinFile | null {
  try {
    const f = JSON.parse(fs.readFileSync(PIN_FILE, "utf8")) as PinFile;
    return f.salt && f.hash && f.secret ? f : null;
  } catch {
    return null;
  }
}

const hashPin = (pin: string, salt: string) => crypto.scryptSync(pin, salt, 32).toString("hex");

const sameHex = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));

export const pinEnabled = () => readPinFile() !== null;

let failures = 0;
let lockedUntil = 0;

/** Vérifie le code ; bloque 30 s après 5 essais erronés. */
export function verifyPin(pin: string): boolean {
  const f = readPinFile();
  if (!f) return true;
  const wait = lockedUntil - Date.now();
  if (wait > 0) throw new HttpError(429, `Trop d'essais. Réessayez dans ${Math.ceil(wait / 1000)} s.`);
  if (sameHex(hashPin(pin, f.salt), f.hash)) {
    failures = 0;
    return true;
  }
  failures += 1;
  if (failures >= MAX_FAILURES) {
    failures = 0;
    lockedUntil = Date.now() + LOCKOUT_MS;
  }
  return false;
}

export function sessionToken(): string | null {
  const f = readPinFile();
  return f ? crypto.createHmac("sha256", f.secret).update(f.hash).digest("hex") : null;
}

function cookieValue(req: FastifyRequest, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function isUnlocked(req: FastifyRequest): boolean {
  const expected = sessionToken();
  if (!expected) return true;
  const got = cookieValue(req, SESSION_COOKIE);
  return !!got && /^[0-9a-f]+$/.test(got) && sameHex(got, expected);
}

export function setSessionCookie(reply: FastifyReply, token: string | null) {
  const base = `${SESSION_COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Strict`;
  reply.header("Set-Cookie", token ? `${base}; Max-Age=${60 * 60 * 24 * 365}` : `${base}; Max-Age=0`);
}

export function savePin(pin: string | null) {
  if (pin === null) {
    fs.rmSync(PIN_FILE, { force: true });
    return;
  }
  if (!/^\d{4,8}$/.test(pin)) throw badRequest("Le code doit contenir de 4 à 8 chiffres.");
  const salt = crypto.randomBytes(16).toString("hex");
  const file: PinFile = { salt, hash: hashPin(pin, salt), secret: crypto.randomBytes(32).toString("hex") };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PIN_FILE, JSON.stringify(file));
}

/** Toute l'API (sauf le déverrouillage) exige un appareil déverrouillé quand un code est défini. */
export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  const url = req.url.split("?")[0];
  if (!url.startsWith("/api/") || url.startsWith("/api/auth/")) return;
  if (!isUnlocked(req)) return reply.status(401).send({ message: "Logiciel verrouillé : saisissez le code.", locked: true });
}
