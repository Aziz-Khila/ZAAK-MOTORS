import { eq } from "drizzle-orm";
import { reminderDate, today, type Appointment, type appointmentSchema } from "@garage/shared";
import type { z } from "zod";
import { db } from "../../db/client";
import { appointments } from "../../db/schema";
import { all, get } from "../../lib/sql";
import { notFound } from "../../lib/http";
import { assertVehicleOfClient } from "../vehicles/service";

type AppointmentData = z.output<typeof appointmentSchema>;
type Row = Omit<Appointment, "done" | "reminderDismissed"> & { done: number; reminderDismissed: number };

const SELECT = `
  SELECT a.id, a.title, a.date, a.time, a.client_id AS clientId, a.vehicle_id AS vehicleId, a.notes, a.done,
         a.reminder_value AS reminderValue, a.reminder_unit AS reminderUnit, a.reminder_dismissed AS reminderDismissed,
         COALESCE(c.name, '') AS clientName, COALESCE(c.phone, '') AS clientPhone,
         COALESCE(v.plate, '') AS plate, TRIM(COALESCE(v.brand, '') || ' ' || COALESCE(v.model, '')) AS vehicleLabel
  FROM appointments a
  LEFT JOIN clients c ON c.id = a.client_id
  LEFT JOIN vehicles v ON v.id = a.vehicle_id`;

const toAppointment = (row: Row): Appointment => ({ ...row, done: !!row.done, reminderDismissed: !!row.reminderDismissed });

/** Rendez-vous entre deux dates (incluses), triés par jour puis heure (ceux sans heure en premier). */
export function listAppointments(from?: string, to?: string): Appointment[] {
  return all<Row>(
    `${SELECT}
     WHERE (@from IS NULL OR a.date >= @from) AND (@to IS NULL OR a.date <= @to)
     ORDER BY a.date, a.time, a.id`,
    { from: from ?? null, to: to ?? null },
  ).map(toAppointment);
}

/** Rappels à afficher aujourd'hui : rendez-vous à venir, non faits, dont la date de rappel est atteinte et pas encore marqués « vu ». */
export function listReminders(): Appointment[] {
  const now = today();
  return all<Row>(
    `${SELECT}
     WHERE a.date >= @now AND a.done = 0 AND a.reminder_dismissed = 0 AND a.reminder_value IS NOT NULL
     ORDER BY a.date, a.time, a.id`,
    { now },
  )
    .map(toAppointment)
    .filter((a) => reminderDate(a.date, a.reminderValue!, a.reminderUnit) <= now);
}

function getAppointment(id: number): Appointment {
  const row = get<Row>(`${SELECT} WHERE a.id = @id`, { id });
  if (!row) throw notFound("Rendez-vous");
  return toAppointment(row);
}

export function createAppointment(data: AppointmentData): Appointment {
  assertVehicleOfClient(data.vehicleId, data.clientId);
  const row = db.insert(appointments).values(data).returning({ id: appointments.id }).get();
  return getAppointment(row.id);
}

/** Un rappel déjà « vu » se réactive si la date ou le délai du rappel change. */
export function updateAppointment(id: number, data: AppointmentData): Appointment {
  const before = getAppointment(id);
  assertVehicleOfClient(data.vehicleId, data.clientId);
  const reminderChanged = before.date !== data.date || before.reminderValue !== data.reminderValue || before.reminderUnit !== data.reminderUnit;
  db.update(appointments)
    .set({ ...data, ...(reminderChanged && { reminderDismissed: false }) })
    .where(eq(appointments.id, id))
    .run();
  return getAppointment(id);
}

export function dismissReminder(id: number): Appointment {
  getAppointment(id);
  db.update(appointments).set({ reminderDismissed: true }).where(eq(appointments.id, id)).run();
  return getAppointment(id);
}

export function deleteAppointment(id: number) {
  db.delete(appointments).where(eq(appointments.id, id)).run();
}
