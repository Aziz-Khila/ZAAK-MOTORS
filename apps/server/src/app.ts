import fs from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import { ROOT_DIR } from "./db/client";
import { HttpError } from "./lib/http";
import appointmentRoutes from "./modules/appointments/routes";
import authRoutes from "./modules/auth/routes";
import { authGuard } from "./modules/auth/service";
import backupRoutes from "./modules/backup/routes";
import clientRoutes from "./modules/clients/routes";
import dashboardRoutes from "./modules/dashboard/routes";
import expenseRoutes from "./modules/expenses/routes";
import investmentRoutes from "./modules/investments/routes";
import invoiceRoutes from "./modules/invoices/routes";
import partRoutes from "./modules/parts/routes";
import profitabilityRoutes from "./modules/profitability/routes";
import quoteRoutes from "./modules/quotes/routes";
import serviceTemplateRoutes from "./modules/services/routes";
import settingsRoutes from "./modules/settings/routes";
import vehicleRoutes from "./modules/vehicles/routes";

/** Pour ajouter un module : créer son dossier dans modules/ et l'ajouter à cette liste. */
const MODULES = [
  authRoutes,
  settingsRoutes,
  clientRoutes,
  vehicleRoutes,
  quoteRoutes,
  invoiceRoutes,
  partRoutes,
  appointmentRoutes,
  serviceTemplateRoutes,
  expenseRoutes,
  investmentRoutes,
  profitabilityRoutes,
  dashboardRoutes,
  backupRoutes,
];

const CLIENT_DIST = path.join(ROOT_DIR, "apps", "client", "dist");

/**
 * Un site web ouvert dans le navigateur du PC ou de la tablette ne doit pas pouvoir agir sur le logiciel
 * (annuler une facture…) : toute écriture venant d'une autre origine que le logiciel lui-même est refusée.
 */
async function sameOriginGuard(req: FastifyRequest, reply: FastifyReply) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const origin = req.headers.origin;
  let foreign = req.headers["sec-fetch-site"] === "cross-site";
  if (origin) {
    try {
      foreign ||= new URL(origin).host !== new URL(`http://${req.headers.host}`).host;
    } catch {
      foreign = true;
    }
  }
  if (foreign) return reply.status(403).send({ message: "Requête refusée : elle ne vient pas du logiciel." });
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: "warn" }, bodyLimit: 20 * 1024 * 1024 });

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    const err = error as Error & { code?: string; statusCode?: number };
    if (err.code?.startsWith("SQLITE_CONSTRAINT")) {
      return reply.status(400).send({ message: "Opération impossible : données liées ou en double." });
    }
    if (err.statusCode && err.statusCode < 500) {
      return reply.status(err.statusCode).send({ message: err.message });
    }
    app.log.error(error);
    return reply.status(500).send({ message: `Erreur interne : ${err.message}` });
  });

  app.addHook("onRequest", sameOriginGuard);
  app.addHook("onRequest", authGuard);
  app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "same-origin");
  });
  for (const register of MODULES) await app.register(register);

  if (fs.existsSync(CLIENT_DIST)) {
    await app.register(fastifyStatic, { root: CLIENT_DIST });
  }

  app.setNotFoundHandler((req, reply) => {
    const isFile = /\.[a-z0-9]+$/i.test(req.url.split("?")[0]);
    if (req.url.startsWith("/api/") || isFile || !fs.existsSync(path.join(CLIENT_DIST, "index.html"))) {
      return reply.status(404).send({ message: "Adresse introuvable" });
    }
    return reply.sendFile("index.html");
  });

  return app;
}
