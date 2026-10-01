import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "garage-test-"));
process.env.GARAGE_DATA_DIR = dataDir;

let app: FastifyInstance;
let closeDb: () => void;

async function call<T = any>(method: string, url: string, payload?: unknown): Promise<T> {
  const res = await app.inject({ method: method as "GET", url, payload: payload as object });
  if (res.statusCode >= 400) throw new Error(`${method} ${url} -> ${res.statusCode} ${res.body}`);
  return res.json() as T;
}

beforeAll(async () => {
  const dbm = await import("./db/client");
  const { seedIfEmpty } = await import("./db/seed");
  const { buildApp } = await import("./app");
  dbm.initDb();
  seedIfEmpty();
  closeDb = dbm.closeDb;
  app = await buildApp();
});

afterAll(async () => {
  await app?.close();
  closeDb?.();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

describe("parcours complet", () => {
  it("Client → Véhicule → Devis → Facture → Paiement", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const newClient = await call("POST", "/api/clients", { name: "Ali Ben Salah", phone: "98 123 456" });
    const newVehicle = await call("POST", "/api/vehicles", {
      clientId: newClient.id,
      plate: "123 tu 4567",
      brand: "Peugeot",
      model: "208",
      mileage: 85000,
    });
    expect(newVehicle.plate).toBe("123 TU 4567");

    // Recherche par plaque partielle
    const found = await call("GET", "/api/vehicles?q=123tu");
    expect(found[0].plate).toBe("123 TU 4567");
    const byPhone = await call("GET", "/api/clients?q=98123");
    expect(byPhone[0].name).toBe("Ali Ben Salah");

    // Plaque en double refusée
    const dup = await app.inject({
      method: "POST",
      url: "/api/vehicles",
      payload: { clientId: newClient.id, plate: "123-TU-4567" },
    });
    expect(dup.statusCode).toBe(400);

    // Devis avec la prestation fréquente "Freinage"
    const templates = await call<any[]>("GET", "/api/templates");
    const freinage = templates.find((t) => t.name.startsWith("Freinage"));
    expect(freinage.lines[0].unitPrice).toBe(30000); // taux horaire par défaut
    const quote = await call("POST", "/api/quotes", {
      clientId: newClient.id,
      vehicleId: newVehicle.id,
      date: today,
      lines: freinage.lines,
    });
    expect(quote.number).toMatch(/^DV-\d{4}-0001$/);
    expect(quote.lines).toHaveLength(3);
    // 1,5 h × 30 DT + 2 × 85 DT + 65 DT = 280 DT
    expect(quote.total).toBe(280000);

    await call("PATCH", `/api/quotes/${quote.id}/status`, { status: "accepte" });

    // Facture depuis le devis
    const disquesBefore = (await call<any[]>("GET", "/api/parts?q=DSQ-AV"))[0].stock;
    const draft = await call("POST", `/api/quotes/${quote.id}/invoice`);
    expect(draft.status).toBe("brouillon");
    expect(draft.number).toBeNull();
    expect(draft.total).toBe(280000);
    expect(draft.lines).toHaveLength(3);

    const invoice = await call("POST", `/api/invoices/${draft.id}/validate`);
    expect(invoice.number).toMatch(/^FA-\d{4}-0001$/);
    expect(["facturee", "impayee"]).toContain(invoice.status);
    const disquesAfter = (await call<any[]>("GET", "/api/parts?q=DSQ-AV"))[0].stock;
    expect(disquesAfter).toBe(disquesBefore - 2);

    // Paiements
    const partial = await call("POST", `/api/invoices/${invoice.id}/payments`, {
      amount: 100000,
      method: "especes",
      date: today,
    });
    expect(partial.remaining).toBe(180000);
    const paid = await call("POST", `/api/invoices/${invoice.id}/payments`, {
      amount: 180000,
      method: "cheque",
      date: today,
    });
    expect(paid.status).toBe("payee");

    // Charges et rentabilité
    await call("POST", "/api/charges", {
      label: "Loyer",
      kind: "fixe",
      category: "loyer",
      amount: 50000,
      frequency: "mensuelle",
      startDate: today,
    });
    await call("POST", "/api/charges", {
      label: "Huile en vrac",
      kind: "variable",
      category: "huiles",
      amount: 10000,
      frequency: "ponctuelle",
      startDate: today,
    });
    await call("POST", "/api/investments", { designation: "Compresseur", purchaseDate: today, price: 20000, lifetimeMonths: 10 });
    const p = await call("GET", `/api/profitability?period=custom&from=${today}&to=${today}`);
    expect(p.laborRevenue).toBe(45000);
    expect(p.partsRevenue).toBe(235000);
    expect(p.revenue).toBe(280000);
    expect(p.partsCost).toBe(165000); // 2 × 60 + 45
    expect(p.partsMargin).toBe(70000);
    expect(p.collected).toBe(280000);
    expect(p.grossMargin).toBe(280000 - 165000 - 10000);
    expect(p.depreciation).toBe(2000);
    expect(p.result).toBe(280000 - 165000 - 10000 - 50000 - 2000);

    const dash = await call("GET", "/api/dashboard?period=today");
    expect(dash.revenueToday).toBe(280000);
    expect(dash.invoices.toCollect).toBe(0);
    expect(dash.counts.vehicles).toBeGreaterThanOrEqual(1);

    // Historique client / véhicule
    const client = await call("GET", `/api/clients/${newClient.id}`);
    expect(client.totalSpent).toBe(280000);
    expect(client.balance).toBe(0);
    const vehicle = await call("GET", `/api/vehicles/${newVehicle.id}`);
    expect(vehicle.replacedParts).toHaveLength(2);
    expect(vehicle.mileage).toBe(85000);
  });

  it("annule une facture et remet les pièces en stock", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const client = await call("POST", "/api/clients", { name: "Garage test annulation" });
    const part = (await call<any[]>("GET", "/api/parts?q=FH-STD"))[0];
    const draft = await call("POST", "/api/invoices", {
      clientId: client.id,
      date: today,
      lines: [
        {
          type: "piece",
          designation: part.designation,
          partId: part.id,
          quantity: 3,
          unitPrice: part.salePrice,
          unitCost: part.purchasePrice,
        },
      ],
    });
    await call("POST", `/api/invoices/${draft.id}/validate`);
    expect((await call("GET", `/api/parts/${part.id}`)).stock).toBe(part.stock - 3);
    const cancelled = await call("POST", `/api/invoices/${draft.id}/cancel`);
    expect(cancelled.status).toBe("annulee");
    expect((await call("GET", `/api/parts/${part.id}`)).stock).toBe(part.stock);
  });

  it("supprime un client qui n'a que d'anciens ordres de réparation", async () => {
    const client = await call("POST", "/api/clients", { name: "Mehrez Kamoun" });
    const vehicle = await call("POST", "/api/vehicles", { clientId: client.id, plate: "77 TU 1234" });
    const { getSqlite } = await import("./db/client");
    const { lastInsertRowid } = getSqlite()
      .prepare("INSERT INTO interventions (number, client_id, vehicle_id, entry_date) VALUES ('OR-2025-0001', ?, ?, '2025-01-01')")
      .run(client.id, vehicle.id);
    getSqlite()
      .prepare("INSERT INTO document_lines (doc_type, doc_id, type, designation, quantity, unit_price, total) VALUES ('intervention', ?, 'prestation', 'Contrôle', 1, 0, 0)")
      .run(lastInsertRowid);

    await call("DELETE", `/api/clients/${client.id}`);
    expect(getSqlite().prepare("SELECT COUNT(*) AS n FROM interventions").get()).toEqual({ n: 0 });
    expect(getSqlite().prepare("SELECT COUNT(*) AS n FROM document_lines WHERE doc_type = 'intervention'").get()).toEqual({ n: 0 });
  });

  it("agenda : rendez-vous par période, conservés si le client est supprimé", async () => {
    const client = await call("POST", "/api/clients", { name: "Sami Trabelsi", phone: "22 333 444" });
    const vehicle = await call("POST", "/api/vehicles", { clientId: client.id, plate: "55 TU 8888", brand: "Mercedes", model: "C200" });
    const rdv = await call("POST", "/api/appointments", { title: "Vidange", date: "2030-05-12", time: "09:30", clientId: client.id, vehicleId: vehicle.id });
    expect(rdv).toMatchObject({ clientName: "Sami Trabelsi", clientPhone: "22 333 444", plate: "55 TU 8888", vehicleLabel: "Mercedes C200", done: false });
    await call("POST", "/api/appointments", { title: "Livraison pièces", date: "2030-05-12" });
    await call("POST", "/api/appointments", { title: "Hors période", date: "2030-06-01" });

    const day = await call<{ title: string }[]>("GET", "/api/appointments?from=2030-05-12&to=2030-05-12");
    expect(day.map((a) => a.title)).toEqual(["Livraison pièces", "Vidange"]);

    const done = await call("PUT", `/api/appointments/${rdv.id}`, { ...rdv, done: true });
    expect(done.done).toBe(true);

    await call("DELETE", `/api/clients/${client.id}`);
    const kept = (await call<{ id: number; clientId: number | null; vehicleId: number | null }[]>("GET", "/api/appointments?from=2030-05-12&to=2030-05-12")).find(
      (a) => a.id === rdv.id,
    );
    expect(kept).toMatchObject({ clientId: null, vehicleId: null });
  });

  it("agenda : rappels N jours / semaines / mois avant", async () => {
    const { addDays, today } = await import("@garage/shared");
    const now = today();
    const due = await call("POST", "/api/appointments", { title: "Contrôle technique", date: addDays(now, 3), reminderValue: 1, reminderUnit: "semaines" });
    await call("POST", "/api/appointments", { title: "Trop tôt", date: addDays(now, 20), reminderValue: 1, reminderUnit: "semaines" });
    await call("POST", "/api/appointments", { title: "Sans rappel", date: addDays(now, 1) });
    await call("POST", "/api/appointments", { title: "Déjà fait", date: addDays(now, 2), reminderValue: 5, reminderUnit: "jours", done: true });

    const titles = async () => (await call<{ title: string }[]>("GET", "/api/appointments/reminders")).map((a) => a.title);
    expect(await titles()).toEqual(["Contrôle technique"]);

    await call("POST", `/api/appointments/${due.id}/dismiss-reminder`);
    expect(await titles()).toEqual([]);

    await call("PUT", `/api/appointments/${due.id}`, { ...due, date: addDays(now, 4) });
    expect(await titles()).toEqual(["Contrôle technique"]);
  });
});

describe("protections", () => {
  const status = async (method: string, url: string, payload?: unknown, headers?: Record<string, string>) =>
    (await app.inject({ method: method as "GET", url, payload: payload as object, headers })).statusCode;

  it("une période invalide est refusée sans bloquer le serveur", async () => {
    expect(await status("GET", "/api/profitability?period=custom&from=2026-01-01&to=zzzz")).toBe(400);
    expect(await status("GET", "/api/dashboard?period=custom&from=2026-02-30")).toBe(400);
    const reversed = await call("GET", "/api/profitability?period=custom&from=2026-03-31&to=2026-03-01");
    expect(reversed).toMatchObject({ from: "2026-03-01", to: "2026-03-31" });
  });

  it("refuse les écritures venant d'un autre site", async () => {
    const payload = { name: "Client CSRF" };
    expect(await status("POST", "/api/clients", payload, { origin: "http://evil.example" })).toBe(403);
    expect(await status("POST", "/api/clients", payload, { "sec-fetch-site": "cross-site" })).toBe(403);
    expect(await status("POST", "/api/clients", payload, { origin: "http://localhost:80", host: "localhost:80" })).toBe(200);
  });

  it("refuse les données impossibles", async () => {
    const client = await call("POST", "/api/clients", { name: "Client validation" });
    const other = await call("POST", "/api/clients", { name: "Autre client" });
    const vehicle = await call("POST", "/api/vehicles", { clientId: other.id, plate: "999 TU 1" });
    expect(await status("POST", "/api/invoices", { clientId: client.id, date: "2026-02-30" })).toBe(400);
    expect(await status("POST", "/api/appointments", { title: "RDV", date: "2026-05-01", time: "25:00" })).toBe(400);
    expect(await status("POST", "/api/invoices", { clientId: client.id, vehicleId: vehicle.id, date: "2026-05-01" })).toBe(400);
    expect(await status("POST", "/api/appointments", { title: "RDV", date: "2026-05-01", clientId: client.id, vehicleId: vehicle.id })).toBe(400);
    expect(await status("POST", "/api/invoices", { clientId: client.id, date: "2026-05-01", dueDate: "2026-04-01" })).toBe(400);
    const ghostPart = { type: "piece", designation: "Fantôme", partId: 999999, quantity: 1, unitPrice: 1000 };
    expect(await status("POST", "/api/invoices", { clientId: client.id, date: "2026-05-01", lines: [ghostPart] })).toBe(400);
    expect(await status("POST", "/api/invoices", { clientId: client.id, date: "2026-05-01", lines: [{ ...ghostPart, partId: null, quantity: 1e12 }] })).toBe(400);
    expect(await status("POST", "/api/investments", { designation: "Pont", purchaseDate: "2026-01-01", price: 1000, lifetimeMonths: 0 })).toBe(400);
    const charge = { label: "Loyer", kind: "fixe", category: "loyer", amount: 1000, frequency: "mensuelle", startDate: "2026-05-01", endDate: "2026-01-01" };
    expect(await status("POST", "/api/charges", charge)).toBe(400);
    const settings = await call("GET", "/api/settings");
    expect(await status("PUT", "/api/settings", { ...settings, invoiceDueDays: 1_000_000_000 })).toBe(400);
  });

  it("garde une numérotation des factures chronologique", async () => {
    const { addDays, today } = await import("@garage/shared");
    const client = await call("POST", "/api/clients", { name: "Client numérotation" });
    const line = { type: "prestation", designation: "Diagnostic", quantity: 1, unitPrice: 25000 };
    const draft = (date: string, lines = [line]) => call("POST", "/api/invoices", { clientId: client.id, date, lines });

    const future = await draft(addDays(today(), 5));
    expect(await status("POST", `/api/invoices/${future.id}/validate`)).toBe(400);
    const free = await draft(today(), [{ ...line, unitPrice: 0 }]);
    expect(await status("POST", `/api/invoices/${free.id}/validate`)).toBe(400);

    await call("POST", `/api/invoices/${(await draft(today())).id}/validate`);
    const late = await draft(`${today().slice(0, 4)}-01-01`);
    const res = await app.inject({ method: "POST", url: `/api/invoices/${late.id}/validate` });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("chronologique");
  });

  it("les listes renvoient tout, même au-delà de 500 lignes", async () => {
    const { getSqlite } = await import("./db/client");
    const insert = getSqlite().prepare("INSERT INTO clients (name) VALUES (?)");
    getSqlite().transaction(() => {
      for (let i = 0; i < 520; i++) insert.run(`Client en masse ${i}`);
    })();
    const total = (getSqlite().prepare("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n;
    expect((await call<unknown[]>("GET", "/api/clients")).length).toBe(total);
  });
});

describe("code PIN", () => {
  it("verrouille l'API, se déverrouille avec le bon code et se désactive", async () => {
    const set = await app.inject({ method: "PUT", url: "/api/auth/pin", payload: { newPin: "2468" } });
    expect(set.statusCode).toBe(200);
    const cookie = String(set.headers["set-cookie"]).split(";")[0];

    expect((await app.inject({ method: "GET", url: "/api/clients" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/clients", headers: { cookie } })).statusCode).toBe(200);

    const wrong = await app.inject({ method: "POST", url: "/api/auth/unlock", payload: { pin: "0000" } });
    expect(wrong.statusCode).toBe(400);
    const ok = await app.inject({ method: "POST", url: "/api/auth/unlock", payload: { pin: "2468" } });
    expect(ok.statusCode).toBe(200);
    expect(String(ok.headers["set-cookie"]).split(";")[0]).toBe(cookie);

    const off = await app.inject({ method: "PUT", url: "/api/auth/pin", headers: { cookie }, payload: { currentPin: "2468", newPin: null } });
    expect(off.json().enabled).toBe(false);
    expect((await app.inject({ method: "GET", url: "/api/clients" })).statusCode).toBe(200);
  });
});
