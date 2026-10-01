import { z } from "zod";
import { FREQUENCY_VALUES, LINE_TYPE_VALUES, PAYMENT_METHOD_VALUES, REMINDER_UNIT_VALUES } from "./constants";
import { isValidISODate } from "./dates";

const TEXT_MAX = 5000;
const NAME_MAX = 200;
/** 1 milliard de DT en millimes : au-delà, les calculs perdraient en précision. */
const MONEY_MAX = 1_000_000_000_000;
/** Prix unitaire × quantité maximum reste sous la limite de précision des nombres. */
const UNIT_PRICE_MAX = 10_000_000_000;
const QUANTITY_MAX = 100_000;
const DAYS_MAX = 3650;

const text = z.string().trim().max(TEXT_MAX, "Texte trop long").default("");
const name = (message: string) => z.string().trim().min(1, message).max(NAME_MAX, "Texte trop long (200 caractères maximum)");
const date = z.string().refine(isValidISODate, "Date invalide");
const money = z.number().int("Montant invalide").max(MONEY_MAX, "Montant trop élevé");
const optionalId = z.number().int().positive().nullable().default(null);
const mileage = z.number().int("Kilométrage invalide").min(0, "Kilométrage invalide").max(9_999_999, "Kilométrage invalide").nullable().default(null);

export const clientSchema = z.object({
  type: z.enum(["particulier", "societe"]).default("particulier"),
  name: name("Le nom du client est obligatoire"),
  phone: text,
  phone2: text,
  address: text,
  email: text,
  taxId: text,
  notes: text,
});
export type ClientInput = z.input<typeof clientSchema>;

export const vehicleBaseSchema = z.object({
  plate: z.string().trim().min(1, "L'immatriculation est obligatoire").max(30, "Immatriculation trop longue"),
  brand: text,
  model: text,
  year: z.number().int().min(1900, "Année invalide").max(2100, "Année invalide").nullable().default(null),
  vin: text,
  mileage,
  fuel: text,
  notes: text,
});
export const vehicleSchema = vehicleBaseSchema.extend({
  clientId: z.number().int().positive("Choisissez le client propriétaire"),
});
export type VehicleInput = z.input<typeof vehicleSchema>;

export const lineSchema = z.object({
  type: z.enum(LINE_TYPE_VALUES),
  designation: z.string().trim().min(1, "Chaque ligne doit avoir une désignation").max(500, "Désignation trop longue"),
  reference: text,
  partId: optionalId,
  quantity: z.number().min(0, "Quantité invalide").max(QUANTITY_MAX, "Quantité trop élevée"),
  unitPrice: money.min(0, "Prix invalide").max(UNIT_PRICE_MAX, "Prix trop élevé"),
  unitCost: money.min(0, "Coût invalide").max(UNIT_PRICE_MAX, "Coût trop élevé").default(0),
});
export type LineInput = z.input<typeof lineSchema>;

const lines = z.array(lineSchema).max(500, "Trop de lignes").default([]);

export const quoteSchema = z.object({
  clientId: z.number().int().positive("Choisissez un client"),
  vehicleId: optionalId,
  date,
  validUntil: date.nullable().default(null),
  notes: text,
  lines,
});
export type QuoteInput = z.input<typeof quoteSchema>;

export const invoiceSchema = z.object({
  clientId: z.number().int().positive("Choisissez un client"),
  vehicleId: optionalId,
  quoteId: optionalId,
  date,
  dueDate: date.nullable().default(null),
  mileage,
  workDone: text,
  notes: text,
  lines,
});
export type InvoiceInput = z.input<typeof invoiceSchema>;

export const paymentSchema = z.object({
  amount: money.positive("Le montant doit être positif"),
  method: z.enum(PAYMENT_METHOD_VALUES).default("especes"),
  date,
  notes: text,
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const partSchema = z.object({
  reference: text,
  designation: name("La désignation est obligatoire"),
  brand: text,
  supplier: text,
  purchasePrice: money.min(0).max(UNIT_PRICE_MAX, "Prix trop élevé").default(0),
  salePrice: money.min(0).max(UNIT_PRICE_MAX, "Prix trop élevé").default(0),
  stock: z.number().max(QUANTITY_MAX, "Stock trop élevé").default(0),
  minStock: z.number().min(0).max(QUANTITY_MAX, "Stock minimum trop élevé").default(0),
  compatible: text,
  notes: text,
});
export type PartInput = z.input<typeof partSchema>;

export const stockEntrySchema = z.object({
  quantity: z.number().positive("Quantité invalide").max(QUANTITY_MAX, "Quantité trop élevée"),
  unitCost: money.min(0).max(UNIT_PRICE_MAX, "Prix trop élevé").nullable().default(null),
  date,
  supplier: text,
  notes: text,
});
export type StockEntryInput = z.input<typeof stockEntrySchema>;

export const stockAdjustSchema = z.object({
  newStock: z.number().min(0, "Le stock compté ne peut pas être négatif").max(QUANTITY_MAX, "Stock trop élevé"),
  notes: text,
});

export const templateSchema = z.object({
  name: name("Le nom de la prestation est obligatoire"),
  category: text,
  notes: text,
  lines,
});
export type TemplateInput = z.input<typeof templateSchema>;

export const chargeSchema = z.object({
  label: name("Le libellé est obligatoire"),
  kind: z.enum(["fixe", "variable"]),
  category: z.string().min(1).max(100),
  amount: money.positive("Le montant doit être positif"),
  frequency: z.enum(FREQUENCY_VALUES).default("ponctuelle"),
  startDate: date,
  endDate: date.nullable().default(null),
  supplier: text,
  notes: text,
});
export type ChargeInput = z.input<typeof chargeSchema>;

export const revenueSchema = z.object({
  label: name("Le libellé est obligatoire"),
  amount: money.positive("Le montant doit être positif"),
  date,
  notes: text,
});
export type RevenueInput = z.input<typeof revenueSchema>;

export const investmentSchema = z.object({
  designation: name("La désignation est obligatoire"),
  category: z.string().max(100).default("autre"),
  purchaseDate: date,
  price: money.positive("Le prix doit être positif"),
  supplier: text,
  lifetimeMonths: z.number().int().min(1, "La durée doit être d'au moins 1 mois").max(600, "Durée trop longue (50 ans maximum)").nullable().default(null),
  notes: text,
});
export type InvestmentInput = z.input<typeof investmentSchema>;

export const appointmentSchema = z.object({
  title: name("L'objet du rendez-vous est obligatoire"),
  date,
  time: z
    .string()
    .regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/, "Heure invalide")
    .default(""),
  clientId: optionalId,
  vehicleId: optionalId,
  notes: text,
  done: z.boolean().default(false),
  reminderValue: z.number().int().positive("Délai de rappel invalide").max(999, "Délai de rappel trop long").nullable().default(null),
  reminderUnit: z.enum(REMINDER_UNIT_VALUES).default("jours"),
});
export type AppointmentInput = z.input<typeof appointmentSchema>;

export const settingsSchema = z.object({
  garageName: text,
  address: text,
  phone: text,
  email: text,
  taxId: text,
  /** Image en data URL (redimensionnée par l'interface). */
  logo: z.string().max(5_000_000, "Logo trop lourd").default(""),
  hourlyRate: money.min(0),
  vatEnabled: z.boolean(),
  vatRate: z.number().min(0).max(100),
  stampEnabled: z.boolean(),
  stampAmount: money.min(0),
  defaultPartMargin: z.number().min(0).max(1000, "Marge trop élevée").default(30),
  quoteValidityDays: z.number().int().min(0).max(DAYS_MAX, "Durée de validité trop longue (10 ans maximum)").default(30),
  invoiceDueDays: z.number().int().min(0).max(DAYS_MAX, "Délai de paiement trop long (10 ans maximum)").default(0),
  quoteFooter: text,
  invoiceFooter: text,
});
export type SettingsInput = z.input<typeof settingsSchema>;
export type Settings = z.output<typeof settingsSchema>;
