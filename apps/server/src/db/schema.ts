import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Montants en millimes (entiers). Dates au format AAAA-MM-JJ. */

const createdAt = () => text("created_at").notNull().default(sql`(datetime('now','localtime'))`);

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  garageName: text("garage_name").notNull().default("Mon garage"),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  taxId: text("tax_id").notNull().default(""),
  logo: text("logo").notNull().default(""),
  hourlyRate: integer("hourly_rate").notNull().default(30000),
  vatEnabled: integer("vat_enabled", { mode: "boolean" }).notNull().default(false),
  vatRate: real("vat_rate").notNull().default(19),
  stampEnabled: integer("stamp_enabled", { mode: "boolean" }).notNull().default(false),
  stampAmount: integer("stamp_amount").notNull().default(1000),
  defaultPartMargin: real("default_part_margin").notNull().default(30),
  quoteValidityDays: integer("quote_validity_days").notNull().default(30),
  invoiceDueDays: integer("invoice_due_days").notNull().default(0),
  quoteFooter: text("quote_footer").notNull().default(""),
  invoiceFooter: text("invoice_footer").notNull().default(""),
});

export const counters = sqliteTable(
  "counters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    year: integer("year").notNull(),
    value: integer("value").notNull().default(0),
  },
  (t) => [uniqueIndex("counters_name_year").on(t.name, t.year)],
);

export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull().default("particulier"),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    phoneDigits: text("phone_digits").notNull().default(""),
    phone2: text("phone2").notNull().default(""),
    address: text("address").notNull().default(""),
    email: text("email").notNull().default(""),
    taxId: text("tax_id").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("clients_name").on(t.name), index("clients_phone").on(t.phoneDigits)],
);

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    plate: text("plate").notNull(),
    plateNorm: text("plate_norm").notNull(),
    brand: text("brand").notNull().default(""),
    model: text("model").notNull().default(""),
    year: integer("year"),
    vin: text("vin").notNull().default(""),
    mileage: integer("mileage"),
    fuel: text("fuel").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("vehicles_plate_norm").on(t.plateNorm), index("vehicles_client").on(t.clientId)],
);

export const interventions = sqliteTable(
  "interventions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    entryDate: text("entry_date").notNull(),
    mileage: integer("mileage"),
    complaint: text("complaint").notNull().default(""),
    diagnosis: text("diagnosis").notNull().default(""),
    workTodo: text("work_todo").notNull().default(""),
    workDone: text("work_done").notNull().default(""),
    laborHours: real("labor_hours"),
    status: text("status").notNull().default("recu"),
    deliveredAt: text("delivered_at"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now','localtime'))`),
  },
  (t) => [
    index("interventions_status").on(t.status),
    index("interventions_vehicle").on(t.vehicleId),
    index("interventions_client").on(t.clientId),
    uniqueIndex("interventions_number").on(t.number),
  ],
);

/**
 * Lignes de documents, partagées par les interventions, devis, factures et prestations fréquentes.
 * doc_type : 'intervention' | 'quote' | 'invoice' | 'template'
 */
export const documentLines = sqliteTable(
  "document_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    docType: text("doc_type").notNull(),
    docId: integer("doc_id").notNull(),
    position: integer("position").notNull().default(0),
    type: text("type").notNull(),
    designation: text("designation").notNull(),
    reference: text("reference").notNull().default(""),
    partId: integer("part_id"),
    quantity: real("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0),
    unitCost: integer("unit_cost").notNull().default(0),
    total: integer("total").notNull().default(0),
  },
  (t) => [index("document_lines_doc").on(t.docType, t.docId), index("document_lines_part").on(t.partId)],
);

export const quotes = sqliteTable(
  "quotes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull(),
    interventionId: integer("intervention_id").references(() => interventions.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    vehicleId: integer("vehicle_id").references(() => vehicles.id),
    date: text("date").notNull(),
    validUntil: text("valid_until"),
    status: text("status").notNull().default("en_attente"),
    notes: text("notes").notNull().default(""),
    subtotal: integer("subtotal").notNull().default(0),
    vatRate: real("vat_rate").notNull().default(0),
    vat: integer("vat").notNull().default(0),
    stamp: integer("stamp").notNull().default(0),
    total: integer("total").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("quotes_number").on(t.number), index("quotes_status").on(t.status)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number"),
    quoteId: integer("quote_id").references(() => quotes.id),
    interventionId: integer("intervention_id").references(() => interventions.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    vehicleId: integer("vehicle_id").references(() => vehicles.id),
    date: text("date").notNull(),
    dueDate: text("due_date"),
    status: text("status").notNull().default("brouillon"),
    mileage: integer("mileage"),
    workDone: text("work_done").notNull().default(""),
    notes: text("notes").notNull().default(""),
    subtotal: integer("subtotal").notNull().default(0),
    vatRate: real("vat_rate").notNull().default(0),
    vat: integer("vat").notNull().default(0),
    stamp: integer("stamp").notNull().default(0),
    total: integer("total").notNull().default(0),
    paid: integer("paid").notNull().default(0),
    validatedAt: text("validated_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("invoices_number").on(t.number),
    index("invoices_status").on(t.status),
    index("invoices_date").on(t.date),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id),
    amount: integer("amount").notNull(),
    method: text("method").notNull().default("especes"),
    date: text("date").notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("payments_invoice").on(t.invoiceId), index("payments_date").on(t.date)],
);

export const parts = sqliteTable(
  "parts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reference: text("reference").notNull().default(""),
    designation: text("designation").notNull(),
    brand: text("brand").notNull().default(""),
    supplier: text("supplier").notNull().default(""),
    purchasePrice: integer("purchase_price").notNull().default(0),
    salePrice: integer("sale_price").notNull().default(0),
    stock: real("stock").notNull().default(0),
    minStock: real("min_stock").notNull().default(0),
    compatible: text("compatible").notNull().default(""),
    notes: text("notes").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("parts_reference").on(t.reference)],
);

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    partId: integer("part_id")
      .notNull()
      .references(() => parts.id),
    date: text("date").notNull(),
    kind: text("kind").notNull(),
    quantity: real("quantity").notNull(),
    unitCost: integer("unit_cost").notNull().default(0),
    invoiceId: integer("invoice_id").references(() => invoices.id),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_part").on(t.partId)],
);

export const serviceTemplates = sqliteTable("service_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

export const charges = sqliteTable(
  "charges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    label: text("label").notNull(),
    kind: text("kind").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    frequency: text("frequency").notNull().default("ponctuelle"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    supplier: text("supplier").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("charges_kind").on(t.kind)],
);

export const revenues = sqliteTable("revenues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull().default(""),
    clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
    vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    notes: text("notes").notNull().default(""),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    reminderValue: integer("reminder_value"),
    reminderUnit: text("reminder_unit").notNull().default("jours"),
    reminderDismissed: integer("reminder_dismissed", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("appointments_date").on(t.date)],
);

export const investments = sqliteTable("investments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  designation: text("designation").notNull(),
  category: text("category").notNull().default("autre"),
  purchaseDate: text("purchase_date").notNull(),
  price: integer("price").notNull(),
  supplier: text("supplier").notNull().default(""),
  lifetimeMonths: integer("lifetime_months"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});
