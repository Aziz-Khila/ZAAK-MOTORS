import type { FastifyInstance } from "fastify";
import { invoiceSchema, paymentSchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import {
  addPayment,
  cancelInvoice,
  createInvoice,
  createInvoiceFromQuote,
  deleteInvoice,
  deletePayment,
  getInvoiceDetail,
  listInvoices,
  updateInvoice,
  validateInvoice,
} from "./service";

export default async function invoiceRoutes(app: FastifyInstance) {
  app.get("/api/invoices", async (req) => {
    const { q, status, clientId, vehicleId, unpaid } = query(req);
    return listInvoices({
      q,
      status: status || undefined,
      unpaid: unpaid === "1",
      clientId: clientId ? Number(clientId) : undefined,
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
    });
  });
  app.get("/api/invoices/:id", async (req) => getInvoiceDetail(idParam(req)));
  app.post("/api/invoices", async (req) => createInvoice(parse(invoiceSchema, req.body)));
  app.post("/api/quotes/:id/invoice", async (req) => createInvoiceFromQuote(idParam(req)));
  app.put("/api/invoices/:id", async (req) => updateInvoice(idParam(req), parse(invoiceSchema, req.body)));
  app.post("/api/invoices/:id/validate", async (req) => validateInvoice(idParam(req)));
  app.post("/api/invoices/:id/cancel", async (req) => cancelInvoice(idParam(req)));
  app.delete("/api/invoices/:id", async (req) => {
    deleteInvoice(idParam(req));
    return { ok: true };
  });
  app.post("/api/invoices/:id/payments", async (req) => addPayment(idParam(req), parse(paymentSchema, req.body)));
  app.delete("/api/payments/:id", async (req) => deletePayment(idParam(req)));
}
