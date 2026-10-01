ALTER TABLE `appointments` ADD `reminder_value` integer;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reminder_unit` text DEFAULT 'jours' NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reminder_dismissed` integer DEFAULT false NOT NULL;