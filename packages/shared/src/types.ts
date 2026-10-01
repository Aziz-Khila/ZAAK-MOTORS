import type { InvoiceStatus, LineType, QuoteStatus, ReminderUnit } from "./constants";
import type { Settings } from "./schemas";

/** Types des réponses de l'API (montants en millimes). */

export interface Client {
  id: number;
  type: "particulier" | "societe";
  name: string;
  phone: string;
  phone2: string;
  address: string;
  email: string;
  taxId: string;
  notes: string;
  createdAt: string;
}

export interface ClientListItem extends Client {
  vehicleCount: number;
  balance: number;
  plates: string;
}

export interface Vehicle {
  id: number;
  clientId: number;
  plate: string;
  plateNorm: string;
  brand: string;
  model: string;
  year: number | null;
  vin: string;
  mileage: number | null;
  fuel: string;
  notes: string;
  createdAt: string;
}

export interface VehicleListItem extends Vehicle {
  clientName: string;
  clientPhone: string;
}

export interface Line {
  id?: number;
  type: LineType;
  designation: string;
  reference: string;
  partId: number | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  total?: number;
}

export interface Quote {
  id: number;
  number: string;
  clientId: number;
  vehicleId: number | null;
  date: string;
  validUntil: string | null;
  status: QuoteStatus;
  notes: string;
  subtotal: number;
  vatRate: number;
  vat: number;
  stamp: number;
  total: number;
  createdAt: string;
}

export interface QuoteListItem extends Quote {
  clientName: string;
  plate: string;
  invoiceId: number | null;
}

export interface QuoteDetail extends QuoteListItem {
  lines: Line[];
  client: Client;
  vehicle: Vehicle | null;
}

export interface Invoice {
  id: number;
  number: string | null;
  quoteId: number | null;
  clientId: number;
  vehicleId: number | null;
  date: string;
  dueDate: string | null;
  status: InvoiceStatus;
  mileage: number | null;
  workDone: string;
  notes: string;
  subtotal: number;
  vatRate: number;
  vat: number;
  stamp: number;
  total: number;
  paid: number;
  validatedAt: string | null;
  createdAt: string;
}

export interface InvoiceListItem extends Invoice {
  clientName: string;
  plate: string;
  remaining: number;
}

export interface Payment {
  id: number;
  invoiceId: number;
  amount: number;
  method: string;
  date: string;
  notes: string;
}

export interface InvoiceDetail extends InvoiceListItem {
  lines: Line[];
  payments: Payment[];
  client: Client;
  vehicle: Vehicle | null;
  quoteNumber: string | null;
}

export interface Part {
  id: number;
  reference: string;
  designation: string;
  brand: string;
  supplier: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  compatible: string;
  notes: string;
  active: boolean;
}

export interface StockMovement {
  id: number;
  partId: number;
  date: string;
  kind: string;
  quantity: number;
  unitCost: number;
  invoiceId: number | null;
  invoiceNumber: string | null;
  notes: string;
}

export interface ServiceTemplate {
  id: number;
  name: string;
  category: string;
  notes: string;
  lines: Line[];
}

export interface Charge {
  id: number;
  label: string;
  kind: "fixe" | "variable";
  category: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string | null;
  supplier: string;
  notes: string;
}

export interface Revenue {
  id: number;
  label: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Investment {
  id: number;
  designation: string;
  category: string;
  purchaseDate: string;
  price: number;
  supplier: string;
  lifetimeMonths: number | null;
  notes: string;
}

export interface Appointment {
  id: number;
  title: string;
  date: string;
  /** "HH:MM", ou vide pour un rendez-vous sans heure précise. */
  time: string;
  clientId: number | null;
  vehicleId: number | null;
  notes: string;
  done: boolean;
  /** Rappel N jours / semaines / mois avant ; null = pas de rappel. */
  reminderValue: number | null;
  reminderUnit: ReminderUnit;
  /** Le rappel a été marqué « vu ». */
  reminderDismissed: boolean;
  clientName: string;
  clientPhone: string;
  plate: string;
  vehicleLabel: string;
}

export type GarageSettings = Settings;

export interface ClientDetail extends Client {
  vehicles: Vehicle[];
  quotes: QuoteListItem[];
  invoices: InvoiceListItem[];
  balance: number;
  totalSpent: number;
}

export interface ReplacedPart {
  date: string;
  mileage: number | null;
  designation: string;
  reference: string;
  quantity: number;
  invoiceNumber: string | null;
}

export interface VehicleDetail extends Vehicle {
  client: Client;
  quotes: QuoteListItem[];
  invoices: InvoiceListItem[];
  replacedParts: ReplacedPart[];
  totalSpent: number;
}

export interface Profitability {
  from: string;
  to: string;
  laborRevenue: number;
  partsRevenue: number;
  servicesRevenue: number;
  /** CA = main-d'œuvre + pièces + prestations (hors taxes). */
  revenue: number;
  otherRevenues: number;
  invoicedTotal: number;
  collected: number;
  receivablesPeriod: number;
  receivablesTotal: number;
  partsCost: number;
  servicesCost: number;
  partsMargin: number;
  laborMargin: number;
  variableCharges: number;
  fixedCharges: number;
  grossMargin: number;
  /** Amortissement des investissements inclus. */
  result: number;
  /** Mensualités d'investissement (prix ÷ durée) tombant dans la période. */
  depreciation: number;
  invoiceCount: number;
  chargesByCategory: { category: string; kind: string; amount: number }[];
  monthly: { month: string; revenue: number; charges: number; result: number }[];
}

export interface Dashboard {
  counts: { clients: number; vehicles: number };
  quotes: { en_attente: number; accepte: number; refuse: number; pendingTotal: number };
  invoices: { unpaidCount: number; toCollect: number; overdueCount: number; draftCount: number };
  revenueToday: number;
  revenueMonth: number;
  revenueYear: number;
  period: Profitability;
  lowStock: Pick<Part, "id" | "reference" | "designation" | "stock" | "minStock">[];
  overdueInvoices: Pick<InvoiceListItem, "id" | "number" | "clientName" | "remaining" | "dueDate">[];
}
