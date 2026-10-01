import type { FastifyInstance } from "fastify";
import { getPeriod, type Dashboard } from "@garage/shared";
import { query } from "../../lib/http";
import { all, scalar } from "../../lib/sql";
import { refreshOverdue } from "../invoices/service";
import { lowStockParts } from "../parts/service";
import { computeProfitability, revenueBetween } from "../profitability/service";
import { periodFromQuery } from "../profitability/routes";

function buildDashboard(q: Record<string, string | undefined>): Dashboard {
  refreshOverdue();
  const period = periodFromQuery(q);

  const counts = {
    clients: scalar("SELECT COUNT(*) FROM clients"),
    vehicles: scalar("SELECT COUNT(*) FROM vehicles"),
  };

  const params = { from: period.from, to: period.to };
  const quotes = {
    en_attente: scalar("SELECT COUNT(*) FROM quotes WHERE status = 'en_attente'"),
    accepte: scalar("SELECT COUNT(*) FROM quotes WHERE status = 'accepte' AND date BETWEEN @from AND @to", params),
    refuse: scalar("SELECT COUNT(*) FROM quotes WHERE status = 'refuse' AND date BETWEEN @from AND @to", params),
    pendingTotal: scalar("SELECT COALESCE(SUM(total), 0) FROM quotes WHERE status = 'en_attente'"),
  };

  const invoices = {
    unpaidCount: scalar(
      "SELECT COUNT(*) FROM invoices WHERE status IN ('facturee','partielle','impayee') AND paid < total",
    ),
    toCollect: scalar(
      "SELECT COALESCE(SUM(total - paid), 0) FROM invoices WHERE status IN ('facturee','partielle','impayee')",
    ),
    overdueCount: scalar("SELECT COUNT(*) FROM invoices WHERE status = 'impayee'"),
    draftCount: scalar("SELECT COUNT(*) FROM invoices WHERE status = 'brouillon'"),
  };

  const day = getPeriod("today");
  const month = getPeriod("month");
  const year = getPeriod("year");

  return {
    counts,
    quotes,
    invoices,
    revenueToday: revenueBetween(day.from, day.to),
    revenueMonth: revenueBetween(month.from, month.to),
    revenueYear: revenueBetween(year.from, year.to),
    period: computeProfitability(period.from, period.to),
    lowStock: lowStockParts(),
    overdueInvoices: all(
      `SELECT f.id, f.number, c.name AS clientName, f.total - f.paid AS remaining, f.due_date AS dueDate
       FROM invoices f JOIN clients c ON c.id = f.client_id
       WHERE f.status = 'impayee' ORDER BY f.due_date LIMIT 10`,
    ),
  };
}

export default async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (req) => buildDashboard(query(req)));
}
