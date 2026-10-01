/**
 * Tous les montants sont stockés en millimes (entiers) : 1 DT = 1000 millimes.
 */

export function roundMillimes(value: number): number {
  return Math.round(value);
}

export function dinarsToMillimes(dinars: number): number {
  return Math.round(dinars * 1000);
}

export function millimesToDinars(millimes: number): number {
  return millimes / 1000;
}

/** Accepte "1250", "1 250,5", "1250.500" et renvoie des millimes, ou null si invalide. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/\s|\u00a0|\u202f/g, "").replace(/dt|tnd/gi, "").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return dinarsToMillimes(value);
}

/** Accepte "1,5" ou "1.5" (heures, quantités). */
export function parseDecimal(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** Format d'affichage : 1 250,500 DT */
export function formatMoney(millimes: number, withCurrency = true): string {
  const text = numberFormat.format(millimesToDinars(millimes || 0)).replace(/\u202f|\u00a0/g, " ");
  return withCurrency ? `${text} DT` : text;
}

/** Valeur éditable dans un champ : "1250,5" */
export function moneyToInput(millimes: number | null | undefined): string {
  if (millimes === null || millimes === undefined) return "";
  const dinars = millimesToDinars(millimes);
  return String(Number(dinars.toFixed(3))).replace(".", ",");
}

export function formatQuantity(value: number): string {
  return String(Number(value.toFixed(3))).replace(".", ",");
}
