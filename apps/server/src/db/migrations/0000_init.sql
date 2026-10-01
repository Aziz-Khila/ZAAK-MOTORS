CREATE TABLE `charges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`frequency` text DEFAULT 'ponctuelle' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`supplier` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `charges_kind` ON `charges` (`kind`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'particulier' NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`phone_digits` text DEFAULT '' NOT NULL,
	`phone2` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`tax_id` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `clients_name` ON `clients` (`name`);--> statement-breakpoint
CREATE INDEX `clients_phone` ON `clients` (`phone_digits`);--> statement-breakpoint
CREATE TABLE `counters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `counters_name_year` ON `counters` (`name`,`year`);--> statement-breakpoint
CREATE TABLE `document_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doc_type` text NOT NULL,
	`doc_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`type` text NOT NULL,
	`designation` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`part_id` integer,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`unit_cost` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `document_lines_doc` ON `document_lines` (`doc_type`,`doc_id`);--> statement-breakpoint
CREATE INDEX `document_lines_part` ON `document_lines` (`part_id`);--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`client_id` integer NOT NULL,
	`vehicle_id` integer NOT NULL,
	`entry_date` text NOT NULL,
	`mileage` integer,
	`complaint` text DEFAULT '' NOT NULL,
	`diagnosis` text DEFAULT '' NOT NULL,
	`work_todo` text DEFAULT '' NOT NULL,
	`work_done` text DEFAULT '' NOT NULL,
	`labor_hours` real,
	`status` text DEFAULT 'recu' NOT NULL,
	`delivered_at` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interventions_status` ON `interventions` (`status`);--> statement-breakpoint
CREATE INDEX `interventions_vehicle` ON `interventions` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `interventions_client` ON `interventions` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `interventions_number` ON `interventions` (`number`);--> statement-breakpoint
CREATE TABLE `investments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`designation` text NOT NULL,
	`category` text DEFAULT 'autre' NOT NULL,
	`purchase_date` text NOT NULL,
	`price` integer NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`lifetime_months` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text,
	`quote_id` integer,
	`intervention_id` integer,
	`client_id` integer NOT NULL,
	`vehicle_id` integer,
	`date` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'brouillon' NOT NULL,
	`mileage` integer,
	`work_done` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`vat_rate` real DEFAULT 0 NOT NULL,
	`vat` integer DEFAULT 0 NOT NULL,
	`stamp` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`validated_at` text,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`intervention_id`) REFERENCES `interventions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_status` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `invoices_date` ON `invoices` (`date`);--> statement-breakpoint
CREATE TABLE `parts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`designation` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`purchase_price` integer DEFAULT 0 NOT NULL,
	`sale_price` integer DEFAULT 0 NOT NULL,
	`stock` real DEFAULT 0 NOT NULL,
	`min_stock` real DEFAULT 0 NOT NULL,
	`compatible` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parts_reference` ON `parts` (`reference`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'especes' NOT NULL,
	`date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_invoice` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `payments_date` ON `payments` (`date`);--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`intervention_id` integer,
	`client_id` integer NOT NULL,
	`vehicle_id` integer,
	`date` text NOT NULL,
	`valid_until` text,
	`status` text DEFAULT 'en_attente' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`vat_rate` real DEFAULT 0 NOT NULL,
	`vat` integer DEFAULT 0 NOT NULL,
	`stamp` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`intervention_id`) REFERENCES `interventions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_number` ON `quotes` (`number`);--> statement-breakpoint
CREATE INDEX `quotes_status` ON `quotes` (`status`);--> statement-breakpoint
CREATE TABLE `revenues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`garage_name` text DEFAULT 'Mon garage' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`tax_id` text DEFAULT '' NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`hourly_rate` integer DEFAULT 30000 NOT NULL,
	`vat_enabled` integer DEFAULT false NOT NULL,
	`vat_rate` real DEFAULT 19 NOT NULL,
	`stamp_enabled` integer DEFAULT false NOT NULL,
	`stamp_amount` integer DEFAULT 1000 NOT NULL,
	`default_part_margin` real DEFAULT 30 NOT NULL,
	`quote_validity_days` integer DEFAULT 30 NOT NULL,
	`invoice_due_days` integer DEFAULT 0 NOT NULL,
	`quote_footer` text DEFAULT '' NOT NULL,
	`invoice_footer` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_id` integer NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_cost` integer DEFAULT 0 NOT NULL,
	`invoice_id` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_part` ON `stock_movements` (`part_id`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`plate` text NOT NULL,
	`plate_norm` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`year` integer,
	`vin` text DEFAULT '' NOT NULL,
	`mileage` integer,
	`fuel` text DEFAULT '' NOT NULL,
	`engine` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vehicles_plate_norm` ON `vehicles` (`plate_norm`);--> statement-breakpoint
CREATE INDEX `vehicles_client` ON `vehicles` (`client_id`);