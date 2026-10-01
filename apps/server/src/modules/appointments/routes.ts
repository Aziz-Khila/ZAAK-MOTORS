import type { FastifyInstance } from "fastify";
import { appointmentSchema } from "@garage/shared";
import { idParam, parse, query } from "../../lib/http";
import { createAppointment, deleteAppointment, dismissReminder, listAppointments, listReminders, updateAppointment } from "./service";

export default async function appointmentRoutes(app: FastifyInstance) {
  app.get("/api/appointments", async (req) => {
    const { from, to } = query(req);
    return listAppointments(from || undefined, to || undefined);
  });
  app.get("/api/appointments/reminders", async () => listReminders());
  app.post("/api/appointments", async (req) => createAppointment(parse(appointmentSchema, req.body)));
  app.put("/api/appointments/:id", async (req) => updateAppointment(idParam(req), parse(appointmentSchema, req.body)));
  app.post("/api/appointments/:id/dismiss-reminder", async (req) => dismissReminder(idParam(req)));
  app.delete("/api/appointments/:id", async (req) => {
    deleteAppointment(idParam(req));
    return { ok: true };
  });
}
