import { describe, expect, it } from "vitest";
import { computeTotals, lineTotal, paymentStatus, unitMargin, type LineAmounts } from "./calc";
import { formatMoney, moneyToInput, parseMoney } from "./money";
import { formatPlate, normalizePlate } from "./plate";
import { addMonths, getPeriod, isValidISODate, reminderDate } from "./dates";
import { amountInPeriod, depreciationInPeriod, occurrencesInPeriod } from "./recurrence";

const noTax = { vatEnabled: false, vatRate: 19, stampEnabled: false, stampAmount: 1000 };

describe("montants", () => {
  it("formate en dinars tunisiens avec 3 décimales", () => {
    expect(formatMoney(1250500)).toBe("1 250,500 DT");
    expect(formatMoney(0)).toBe("0,000 DT");
  });
  it("lit les saisies usuelles", () => {
    expect(parseMoney("1250,5")).toBe(1250500);
    expect(parseMoney("1 250.500")).toBe(1250500);
    expect(parseMoney("30")).toBe(30000);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(moneyToInput(1250500)).toBe("1250,5");
  });
});

describe("calculs de documents", () => {
  const lines: LineAmounts[] = [
    { type: "main_oeuvre", quantity: 1.5, unitPrice: 30000, unitCost: 0 },
    { type: "piece", quantity: 2, unitPrice: 85000, unitCost: 60000 },
    { type: "prestation", quantity: 1, unitPrice: 20000, unitCost: 15000 },
  ];

  it("main-d'œuvre = heures × taux horaire", () => {
    expect(lineTotal({ quantity: 1.5, unitPrice: 30000 })).toBe(45000);
  });

  it("totalise sans TVA", () => {
    const t = computeTotals(lines, noTax);
    expect(t.labor).toBe(45000);
    expect(t.parts).toBe(170000);
    expect(t.services).toBe(20000);
    expect(t.subtotal).toBe(235000);
    expect(t.vat).toBe(0);
    expect(t.total).toBe(235000);
    expect(t.partsCost).toBe(120000);
    expect(t.partsMargin).toBe(50000);
    expect(t.cost).toBe(135000);
    expect(t.margin).toBe(100000);
  });

  it("applique la TVA et le timbre quand ils sont activés", () => {
    const t = computeTotals(lines, { vatEnabled: true, vatRate: 19, stampEnabled: true, stampAmount: 1000 });
    expect(t.vat).toBe(44650);
    expect(t.stamp).toBe(1000);
    expect(t.total).toBe(235000 + 44650 + 1000);
  });

  it("calcule la marge unitaire", () => {
    expect(unitMargin(85000, 60000)).toEqual({ amount: 25000, percent: 41.7 });
  });

  it("détermine le statut de paiement", () => {
    expect(paymentStatus(100, 0, null, "2026-01-10")).toBe("facturee");
    expect(paymentStatus(100, 40, null, "2026-01-10")).toBe("partielle");
    expect(paymentStatus(100, 100, null, "2026-01-10")).toBe("payee");
    expect(paymentStatus(100, 40, "2026-01-05", "2026-01-10")).toBe("impayee");
  });
});

describe("immatriculations", () => {
  it("normalise les plaques", () => {
    expect(normalizePlate("123 TU 4567")).toBe("123TU4567");
    expect(normalizePlate("123-tu-4567")).toBe("123TU4567");
    expect(normalizePlate("123 تونس 4567")).toBe("123TU4567");
    expect(formatPlate("123tu4567")).toBe("123 TU 4567");
  });
});

describe("périodes et récurrences", () => {
  it("calcule les périodes", () => {
    const ref = new Date(2026, 8, 27); // dimanche 27 sept. 2026
    expect(getPeriod("week", ref)).toEqual({ from: "2026-09-21", to: "2026-09-27" });
    expect(getPeriod("month", ref)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(getPeriod("quarter", ref)).toEqual({ from: "2026-07-01", to: "2026-09-30" });
    expect(getPeriod("year", ref)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("gère les fins de mois", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("compte les échéances des charges récurrentes", () => {
    const loyer = { amount: 800000, frequency: "mensuelle" as const, startDate: "2025-03-05" };
    expect(occurrencesInPeriod(loyer, "2026-01-01", "2026-03-31")).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
    expect(amountInPeriod(loyer, "2026-01-01", "2026-12-31")).toBe(800000 * 12);
    const assurance = { amount: 1200000, frequency: "annuelle" as const, startDate: "2025-06-15" };
    expect(amountInPeriod(assurance, "2026-01-01", "2026-12-31")).toBe(1200000);
    expect(amountInPeriod(assurance, "2026-01-01", "2026-05-31")).toBe(0);
    const trim = { amount: 300000, frequency: "trimestrielle" as const, startDate: "2026-01-10", endDate: "2026-06-30" };
    expect(occurrencesInPeriod(trim, "2026-01-01", "2026-12-31")).toEqual(["2026-01-10", "2026-04-10"]);
    const ponctuelle = { amount: 50000, frequency: "ponctuelle" as const, startDate: "2026-02-10" };
    expect(amountInPeriod(ponctuelle, "2026-02-01", "2026-02-28")).toBe(50000);
    expect(amountInPeriod(ponctuelle, "2026-03-01", "2026-03-31")).toBe(0);
  });

  it("calcule la date d'un rappel", () => {
    expect(reminderDate("2026-10-15", 3, "jours")).toBe("2026-10-12");
    expect(reminderDate("2026-10-15", 2, "semaines")).toBe("2026-10-01");
    expect(reminderDate("2026-03-31", 1, "mois")).toBe("2026-02-28");
  });

  it("reconnaît les vraies dates du calendrier", () => {
    expect(isValidISODate("2026-10-01")).toBe(true);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("zzzz")).toBe(false);
    expect(isValidISODate("99999-01-01")).toBe(false);
  });

  it("amortit un investissement au prorata", () => {
    const pont = { price: 12000000, purchaseDate: "2026-01-01", lifetimeMonths: 120 };
    expect(depreciationInPeriod(pont, "2026-01-01", "2026-12-31")).toBe(1200000);
    expect(depreciationInPeriod(pont, "2026-03-01", "2026-03-31")).toBe(100000);
    expect(depreciationInPeriod(pont, "2025-01-01", "2025-12-31")).toBe(0);
    expect(depreciationInPeriod(pont, "2036-01-01", "2036-12-31")).toBe(0);

    const caisse = { price: 5000000, purchaseDate: "2026-09-01", lifetimeMonths: 36 };
    expect(depreciationInPeriod(caisse, "2026-09-01", "2026-09-30")).toBe(138889);
    expect(depreciationInPeriod(caisse, "2026-01-01", "2030-12-31")).toBe(5000000);
    expect(depreciationInPeriod({ ...caisse, lifetimeMonths: null }, "2026-09-01", "2026-09-30")).toBe(5000000);
  });
});
