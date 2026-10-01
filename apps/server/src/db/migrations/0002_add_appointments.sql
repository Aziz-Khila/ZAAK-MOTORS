CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time` text DEFAULT '' NOT NULL,
	`client_id` integer,
	`vehicle_id` integer,
	`notes` text DEFAULT '' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now','localtime')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `appointments_date` ON `appointments` (`date`);