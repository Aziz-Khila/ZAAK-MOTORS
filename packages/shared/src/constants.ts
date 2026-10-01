export type Option<T extends string = string> = { value: T; label: string };

function labelOf<T extends string>(options: readonly Option<T>[], value: string | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? value ?? "";
}

// ---------- Devis ----------
export const QUOTE_STATUSES = [
  { value: "en_attente", label: "En attente", color: "amber" },
  { value: "accepte", label: "Accepté", color: "green" },
  { value: "refuse", label: "Refusé", color: "red" },
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]["value"];
export const QUOTE_STATUS_VALUES = QUOTE_STATUSES.map((s) => s.value) as [QuoteStatus, ...QuoteStatus[]];
export const quoteStatusLabel = (v: string) => labelOf(QUOTE_STATUSES, v);
export const quoteStatusColor = (v: string) => QUOTE_STATUSES.find((s) => s.value === v)?.color ?? "slate";

// ---------- Factures ----------
export const INVOICE_STATUSES = [
  { value: "brouillon", label: "Brouillon", color: "slate" },
  { value: "facturee", label: "Facturée", color: "blue" },
  { value: "partielle", label: "Partiellement payée", color: "amber" },
  { value: "payee", label: "Payée", color: "green" },
  { value: "impayee", label: "Impayée", color: "red" },
  { value: "annulee", label: "Annulée", color: "gray" },
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]["value"];
export const invoiceStatusLabel = (v: string) => labelOf(INVOICE_STATUSES, v);
export const invoiceStatusColor = (v: string) => INVOICE_STATUSES.find((s) => s.value === v)?.color ?? "slate";
/** Factures comptées dans le chiffre d'affaires. */
export const BILLED_INVOICE_STATUSES: InvoiceStatus[] = ["facturee", "partielle", "payee", "impayee"];

export const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "carte", label: "Carte bancaire" },
  { value: "traite", label: "Traite" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [PaymentMethod, ...PaymentMethod[]];
export const paymentMethodLabel = (v: string) => labelOf(PAYMENT_METHODS, v);

// ---------- Lignes ----------
export const LINE_TYPES = [
  { value: "main_oeuvre", label: "Main-d'œuvre" },
  { value: "piece", label: "Pièce" },
  { value: "prestation", label: "Autre prestation" },
] as const;
export type LineType = (typeof LINE_TYPES)[number]["value"];
export const LINE_TYPE_VALUES = LINE_TYPES.map((t) => t.value) as [LineType, ...LineType[]];
export const lineTypeLabel = (v: string) => labelOf(LINE_TYPES, v);

// ---------- Véhicules / clients ----------
export const FUEL_TYPES = [
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybride", label: "Hybride" },
  { value: "electrique", label: "Électrique" },
  { value: "gpl", label: "GPL" },
  { value: "autre", label: "Autre" },
] as const;
export const fuelLabel = (v: string | null | undefined) => labelOf(FUEL_TYPES, v);

export const CLIENT_TYPES = [
  { value: "particulier", label: "Particulier" },
  { value: "societe", label: "Société" },
] as const;

// ---------- Charges ----------
export const CHARGE_KINDS = [
  { value: "fixe", label: "Charge fixe" },
  { value: "variable", label: "Charge variable" },
] as const;
export type ChargeKind = (typeof CHARGE_KINDS)[number]["value"];

export const FIXED_CHARGE_CATEGORIES = [
  { value: "loyer", label: "Location du local" },
  { value: "salaires", label: "Salaires" },
  { value: "charges_sociales", label: "Charges sociales (CNSS)" },
  { value: "electricite", label: "Électricité" },
  { value: "eau", label: "Eau" },
  { value: "internet", label: "Internet" },
  { value: "telephone", label: "Téléphone" },
  { value: "assurance", label: "Assurance" },
  { value: "comptabilite", label: "Comptabilité" },
  { value: "logiciels", label: "Abonnements logiciels" },
  { value: "taxes", label: "Taxes" },
  { value: "frais_bancaires", label: "Frais bancaires" },
  { value: "autre_fixe", label: "Autre charge fixe" },
] as const;

export const VARIABLE_CHARGE_CATEGORIES = [
  { value: "consommables", label: "Consommables" },
  { value: "huiles", label: "Huiles" },
  { value: "liquides", label: "Liquides" },
  { value: "filtres", label: "Filtres" },
  { value: "nettoyage", label: "Produits de nettoyage" },
  { value: "fournitures", label: "Petites fournitures" },
  { value: "sous_traitance", label: "Sous-traitance" },
  { value: "transport", label: "Transport" },
  { value: "autre_variable", label: "Autre dépense directe" },
] as const;

export const CHARGE_CATEGORIES = [...FIXED_CHARGE_CATEGORIES, ...VARIABLE_CHARGE_CATEGORIES];
export const chargeCategoryLabel = (v: string) => labelOf(CHARGE_CATEGORIES, v);

export const FREQUENCIES = [
  { value: "mensuelle", label: "Mensuelle" },
  { value: "trimestrielle", label: "Trimestrielle" },
  { value: "annuelle", label: "Annuelle" },
  { value: "ponctuelle", label: "Ponctuelle" },
] as const;
export type Frequency = (typeof FREQUENCIES)[number]["value"];
export const FREQUENCY_VALUES = FREQUENCIES.map((f) => f.value) as [Frequency, ...Frequency[]];
export const frequencyLabel = (v: string) => labelOf(FREQUENCIES, v);

// ---------- Agenda ----------
export const REMINDER_UNITS = [
  { value: "jours", label: "jour(s)" },
  { value: "semaines", label: "semaine(s)" },
  { value: "mois", label: "mois" },
] as const;
export type ReminderUnit = (typeof REMINDER_UNITS)[number]["value"];
export const REMINDER_UNIT_VALUES = REMINDER_UNITS.map((u) => u.value) as [ReminderUnit, ...ReminderUnit[]];

// ---------- Investissements ----------
export const INVESTMENT_CATEGORIES = [
  { value: "pont", label: "Pont élévateur" },
  { value: "compresseur", label: "Compresseur" },
  { value: "diagnostic", label: "Machine de diagnostic" },
  { value: "outillage", label: "Outillage" },
  { value: "equipement", label: "Équipement d'atelier" },
  { value: "informatique", label: "Ordinateur / informatique" },
  { value: "mobilier", label: "Mobilier" },
  { value: "amenagement", label: "Aménagement du local" },
  { value: "autre", label: "Autre équipement" },
] as const;
export const investmentCategoryLabel = (v: string) => labelOf(INVESTMENT_CATEGORIES, v);

// ---------- Stock ----------
export const STOCK_MOVEMENT_KINDS = [
  { value: "entree", label: "Entrée (achat)" },
  { value: "sortie", label: "Sortie (facture)" },
  { value: "retour", label: "Retour (facture annulée)" },
  { value: "ajustement", label: "Ajustement / inventaire" },
] as const;
export const stockMovementLabel = (v: string) => labelOf(STOCK_MOVEMENT_KINDS, v);

export { labelOf };
