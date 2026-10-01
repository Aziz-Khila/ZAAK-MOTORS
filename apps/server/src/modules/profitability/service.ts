import {
  addMonths,
  amountInPeriod,
  depreciationInPeriod,
  parseISODate,
  toISODate,
  type Frequency,
  type Profitability,
} from "@garage/shared";
import { db } from "../../db/client";
import { charges, investments } from "../../db/schema";
import { all, scalar } from "../../lib/sql";

const BILLED = "('facturee','partielle','payee','impayee')";

/** Chiffre d'affaires et coûts directs issus des lignes de factures validées. */
function invoiceFigures(from: string, to: string) {
  const rows = all<{ type: string; revenue: number; cost: number }>(
    `SELECT l.type, COALESCE(SUM(l.total), 0) AS revenue, COALESCE(SUM(ROUND(l.quantity * l.unit_cost)), 0) AS cost
     FROM document_lines l JOIN invoices f ON l.doc_type = 'invoice' AND l.doc_id = f.id
     WHERE f.status IN ${BILLED} AND f.date BETWEEN @from AND @to
     GROUP BY l.type`,
    { from, to },
  );
  const byType = (t: string) => rows.find((r) => r.type === t) ?? { revenue: 0, cost: 0 };
  const labor = byType("main_oeuvre");
  const parts = byType("piece");
  const services = byType("prestation");
  return {
    laborRevenue: labor.revenue,
    partsRevenue: parts.revenue,
    servicesRevenue: services.revenue,
    revenue: labor.revenue + parts.revenue + services.revenue,
    partsCost: parts.cost,
    servicesCost: services.cost,
  };
}

function chargeFigures(from: string, to: string) {
  const list = db.select().from(charges).all();
  let fixed = 0;
  let variable = 0;
  const byCategory = new Map<string, { category: string; kind: string; amount: number }>();
  for (const c of list) {
    const amount = amountInPeriod(
      { amount: c.amount, frequency: c.frequency as Frequency, startDate: c.startDate, endDate: c.endDate },
      from,
      to,
    );
    if (!amount) continue;
    if (c.kind === "fixe") fixed += amount;
    else variable += amount;
    const key = `${c.kind}:${c.category}`;
    const entry = byCategory.get(key) ?? { category: c.category, kind: c.kind, amount: 0 };
    entry.amount += amount;
    byCategory.set(key, entry);
  }
  return {
    fixedCharges: fixed,
    variableCharges: variable,
    chargesByCategory: [...byCategory.values()].sort((a, b) => b.amount - a.amount),
  };
}

function core(from: string, to: string) {
  const inv = invoiceFigures(from, to);
  const ch = chargeFigures(from, to);
  const otherRevenues = scalar("SELECT COALESCE(SUM(amount), 0) FROM revenues WHERE date BETWEEN @from AND @to", {
    from,
    to,
  });
  const depreciation = db
    .select()
    .from(investments)
    .all()
    .reduce((s, i) => s + depreciationInPeriod(i, from, to), 0);
  const grossMargin = inv.revenue - inv.partsCost - inv.servicesCost - ch.variableCharges;
  const result = grossMargin + otherRevenues - ch.fixedCharges - depreciation;
  return { ...inv, ...ch, otherRevenues, depreciation, grossMargin, result };
}

export function revenueBetween(from: string, to: string): number {
  return invoiceFigures(from, to).revenue;
}

function monthlySeries(from: string, to: string) {
  const series: Profitability["monthly"] = [];
  const start = parseISODate(from);
  let cursor = toISODate(new Date(start.getFullYear(), start.getMonth(), 1));
  let guard = 0;
  while (cursor <= to && guard < 36) {
    const monthEnd = toISODate(new Date(parseISODate(cursor).getFullYear(), parseISODate(cursor).getMonth() + 1, 0));
    const f = cursor < from ? from : cursor;
    const t = monthEnd > to ? to : monthEnd;
    const c = core(f, t);
    series.push({
      month: cursor.slice(0, 7),
      revenue: c.revenue + c.otherRevenues,
      charges: c.partsCost + c.servicesCost + c.variableCharges + c.fixedCharges + c.depreciation,
      result: c.result,
    });
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return series;
}

export function computeProfitability(from: string, to: string): Profitability {
  const c = core(from, to);
  const invoiceStats = all<{ total: number; remaining: number; count: number }>(
    `SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(total - paid), 0) AS remaining, COUNT(*) AS count
     FROM invoices WHERE status IN ${BILLED} AND date BETWEEN @from AND @to`,
    { from, to },
  )[0];
  const collected = scalar(
    `SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices f ON f.id = p.invoice_id
     WHERE f.status <> 'annulee' AND p.date BETWEEN @from AND @to`,
    { from, to },
  );
  const receivablesTotal = scalar(`SELECT COALESCE(SUM(total - paid), 0) FROM invoices WHERE status IN ${BILLED}`);

  const days = (parseISODate(to).getTime() - parseISODate(from).getTime()) / 86400000;

  return {
    from,
    to,
    laborRevenue: c.laborRevenue,
    partsRevenue: c.partsRevenue,
    servicesRevenue: c.servicesRevenue,
    revenue: c.revenue,
    otherRevenues: c.otherRevenues,
    invoicedTotal: invoiceStats.total,
    collected,
    receivablesPeriod: invoiceStats.remaining,
    receivablesTotal,
    partsCost: c.partsCost,
    servicesCost: c.servicesCost,
    partsMargin: c.partsRevenue - c.partsCost,
    laborMargin: c.laborRevenue,
    variableCharges: c.variableCharges,
    fixedCharges: c.fixedCharges,
    grossMargin: c.grossMargin,
    result: c.result,
    depreciation: c.depreciation,
    invoiceCount: invoiceStats.count,
    chargesByCategory: c.chargesByCategory,
    monthly: days > 31 ? monthlySeries(from, to) : [],
  };
}
