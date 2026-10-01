import type { LineType } from "./constants";

export interface LineAmounts {
  type: LineType;
  /** Quantité ou nombre d'heures. */
  quantity: number;
  /** Prix de vente unitaire (ou taux horaire) en millimes. */
  unitPrice: number;
  /** Prix d'achat unitaire en millimes (0 pour la main-d'œuvre). */
  unitCost: number;
}

export interface TaxSettings {
  vatEnabled: boolean;
  /** Taux en pourcentage, ex. 19. */
  vatRate: number;
  stampEnabled: boolean;
  /** Timbre fiscal en millimes. */
  stampAmount: number;
}

export interface DocumentTotals {
  labor: number;
  parts: number;
  services: number;
  /** Total HT (ou total tout court si la TVA est désactivée). */
  subtotal: number;
  vatRate: number;
  vat: number;
  stamp: number;
  /** Total TTC. */
  total: number;
  /** Coût d'achat total des pièces et prestations. */
  cost: number;
  partsCost: number;
  partsMargin: number;
  /** Marge globale = sous-total − coûts directs. */
  margin: number;
}

export function lineTotal(line: Pick<LineAmounts, "quantity" | "unitPrice">): number {
  return Math.round((line.quantity || 0) * (line.unitPrice || 0));
}

export function lineCost(line: Pick<LineAmounts, "quantity" | "unitCost">): number {
  return Math.round((line.quantity || 0) * (line.unitCost || 0));
}

export function unitMargin(unitPrice: number, unitCost: number): { amount: number; percent: number } {
  const amount = (unitPrice || 0) - (unitCost || 0);
  const percent = unitCost > 0 ? (amount / unitCost) * 100 : unitPrice > 0 ? 100 : 0;
  return { amount, percent: Math.round(percent * 10) / 10 };
}

/** Prix de vente à partir d'un prix d'achat et d'un coefficient de marge en %. */
export function salePriceFromMargin(unitCost: number, marginPercent: number): number {
  return Math.round(unitCost * (1 + marginPercent / 100));
}

export function computeTotals(lines: LineAmounts[], tax: TaxSettings): DocumentTotals {
  let labor = 0;
  let parts = 0;
  let services = 0;
  let cost = 0;
  let partsCost = 0;
  for (const line of lines) {
    const total = lineTotal(line);
    const c = line.type === "main_oeuvre" ? 0 : lineCost(line);
    cost += c;
    if (line.type === "main_oeuvre") labor += total;
    else if (line.type === "piece") {
      parts += total;
      partsCost += c;
    } else services += total;
  }
  const subtotal = labor + parts + services;
  const vatRate = tax.vatEnabled ? tax.vatRate : 0;
  const vat = tax.vatEnabled ? Math.round((subtotal * tax.vatRate) / 100) : 0;
  const stamp = tax.stampEnabled && subtotal > 0 ? tax.stampAmount : 0;
  return {
    labor,
    parts,
    services,
    subtotal,
    vatRate,
    vat,
    stamp,
    total: subtotal + vat + stamp,
    cost,
    partsCost,
    partsMargin: parts - partsCost,
    margin: subtotal - cost,
  };
}

/** Statut de paiement d'une facture validée. */
export function paymentStatus(
  total: number,
  paid: number,
  dueDate: string | null,
  today: string,
): "facturee" | "partielle" | "payee" | "impayee" {
  if (total > 0 && paid >= total) return "payee";
  if (total <= 0) return "payee";
  if (dueDate && dueDate < today) return "impayee";
  if (paid > 0) return "partielle";
  return "facturee";
}
