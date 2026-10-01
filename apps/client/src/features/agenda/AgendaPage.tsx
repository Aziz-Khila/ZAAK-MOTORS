import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, CalendarDays, CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { REMINDER_UNITS, addDays, addMonths, parseISODate, reminderDate, today, type Appointment, type AppointmentInput, type ReminderUnit } from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { ClientFormModal, ClientPicker, FieldWithAction, ModalTitle, VehicleFormModal, VehicleSelect } from "../../components/forms";
import { IntInput } from "../../components/inputs";
import { PlateBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { Button, Card, ConfirmButton, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle, cn } from "../../components/ui";
import { capitalize, dayLabel, reminderDelay } from "./format";
import { RemindersPanel } from "./RemindersPanel";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const monthLabel = (iso: string) => capitalize(parseISODate(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));

/** Premier et dernier jour affichés dans la grille du mois (semaines du lundi au dimanche). */
function monthGrid(month: string) {
  const first = parseISODate(month);
  const start = addDays(month, -((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

const toInput = (a: Appointment): AppointmentInput => ({
  title: a.title,
  date: a.date,
  time: a.time,
  clientId: a.clientId,
  vehicleId: a.vehicleId,
  notes: a.notes,
  done: a.done,
  reminderValue: a.reminderValue,
  reminderUnit: a.reminderUnit,
});

// ---------- Formulaire ----------

const emptyAppointment = (date: string): AppointmentInput => ({
  title: "",
  date,
  time: "",
  clientId: null,
  vehicleId: null,
  notes: "",
  done: false,
  reminderValue: null,
  reminderUnit: "jours",
});

function ReminderSetting({ form, set }: { form: AppointmentInput; set: <K extends keyof AppointmentInput>(k: K, v: AppointmentInput[K]) => void }) {
  const on = form.reminderValue !== null && form.reminderValue !== undefined;
  const unit = form.reminderUnit ?? "jours";
  const when = on && form.reminderValue ? reminderDate(form.date, form.reminderValue, unit) : null;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <Toggle checked={on} onChange={(v) => set("reminderValue", v ? 1 : null)} label="Me le rappeler à l'avance" />
      {on && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <IntInput value={form.reminderValue || null} onChange={(v) => set("reminderValue", v ?? 0)} className="w-24" maxDigits={3} grouping={false} />
            <div className="w-40">
              <Select value={unit} options={REMINDER_UNITS} onChange={(e) => set("reminderUnit", e.target.value as ReminderUnit)} />
            </div>
            <span className="font-medium text-slate-700">avant</span>
          </div>
          {when && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
              <Bell className="size-4" />
              {when <= today()
                ? "Le rappel s'affichera dès aujourd'hui"
                : `Rappel affiché à partir du ${parseISODate(when).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function AppointmentModal({ open, onClose, appointment, date }: { open: boolean; onClose: () => void; appointment: Appointment | null; date: string }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyAppointment(date));
  const [creating, setCreating] = useState<"client" | "vehicle" | null>(null);
  useEffect(() => {
    if (open) setForm(appointment ? toInput(appointment) : emptyAppointment(date));
  }, [open, appointment, date]);
  const set = <K extends keyof AppointmentInput>(k: K, v: AppointmentInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useAction((data: AppointmentInput) => (appointment ? api(`/api/appointments/${appointment.id}`, "PUT", data) : api("/api/appointments", "POST", data)));

  const submit = () => {
    if (form.reminderValue === 0) return toast.error("Indiquez dans combien de jours, semaines ou mois avant vous voulez le rappel");
    save.mutate(form, {
      onSuccess: () => {
        toast.success("Rendez-vous enregistré");
        onClose();
      },
      onError: toast.error,
    });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <ModalTitle
            icon={appointment ? <Pencil className="size-5" /> : <CalendarPlus className="size-5" />}
            title={appointment ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
            subtitle="Client attendu, livraison, rappel…"
          />
        }
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={submit} loading={save.isPending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Objet" required>
            <Input value={form.title} autoFocus placeholder="Ex. : vidange, diagnostic, livraison de pièces…" onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="Heure" hint="Facultative">
              <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWithAction label="Client" action="Nouveau client" onAction={() => setCreating("client")}>
              <ClientPicker
                value={form.clientId ?? null}
                onChange={(id) => setForm((f) => ({ ...f, clientId: id, vehicleId: null }))}
                placeholder="Facultatif : nom, téléphone, plaque…"
              />
            </FieldWithAction>
            <FieldWithAction label="Véhicule" action="Nouveau véhicule" onAction={() => setCreating("vehicle")}>
              <VehicleSelect clientId={form.clientId ?? null} value={form.vehicleId ?? null} onChange={(id) => set("vehicleId", id)} />
            </FieldWithAction>
          </div>
          <ReminderSetting form={form} set={set} />
          <Field label="Notes">
            <Textarea value={form.notes} rows={3} placeholder="Détails, pièces à prévoir…" onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </Modal>
      <ClientFormModal open={open && creating === "client"} onClose={() => setCreating(null)} onSaved={(c) => setForm((f) => ({ ...f, clientId: c.id, vehicleId: null }))} />
      <VehicleFormModal
        open={open && creating === "vehicle"}
        onClose={() => setCreating(null)}
        clientId={form.clientId ?? null}
        onSaved={(v) => setForm((f) => ({ ...f, clientId: v.clientId, vehicleId: v.id }))}
      />
    </>
  );
}

// ---------- Calendrier ----------

function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  counts,
}: {
  month: string;
  onMonth: (m: string) => void;
  selected: string;
  onSelect: (d: string) => void;
  counts: Map<string, number>;
}) {
  const now = today();
  const [picking, setPicking] = useState(false);
  const days = monthGrid(month);
  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7);
  const year = month.slice(0, 4);
  const step = picking ? 12 : 1;
  return (
    <Card
      title={
        <button
          type="button"
          onClick={() => setPicking(!picking)}
          aria-expanded={picking}
          title={picking ? "Revenir aux jours" : "Choisir un mois"}
          className="-mx-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100"
        >
          {picking ? year : monthLabel(month)}
          <ChevronDown className={cn("size-4 text-slate-400 transition-transform", picking && "rotate-180")} />
        </button>
      }
      actions={
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label={picking ? "Année précédente" : "Mois précédent"}
            title={picking ? "Année précédente" : "Mois précédent"}
            icon={<ChevronLeft className="size-5" />}
            onClick={() => onMonth(addMonths(month, -step))}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onMonth(`${now.slice(0, 7)}-01`);
              onSelect(now);
              setPicking(false);
            }}
          >
            Aujourd'hui
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={picking ? "Année suivante" : "Mois suivant"}
            title={picking ? "Année suivante" : "Mois suivant"}
            icon={<ChevronRight className="size-5" />}
            onClick={() => onMonth(addMonths(month, step))}
          />
        </div>
      }
    >
      {picking ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, i) => {
            const value = `${year}-${String(i + 1).padStart(2, "0")}-01`;
            const isShown = value === month;
            const isCurrent = value.slice(0, 7) === now.slice(0, 7);
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onMonth(value);
                  setPicking(false);
                }}
                className={cn(
                  "h-14 rounded-xl text-sm font-semibold transition-colors",
                  isShown ? "bg-slate-900 text-white" : isCurrent ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {capitalize(parseISODate(value).toLocaleDateString("fr-FR", { month: "long" }))}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {w}
            </div>
          ))}
          {days.map((d) => {
            const count = counts.get(d) ?? 0;
            const isSelected = d === selected;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onSelect(d);
                  if (!inMonth(d)) onMonth(`${d.slice(0, 7)}-01`);
                }}
                className={cn(
                  "flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-sm font-semibold transition-colors",
                  isSelected ? "bg-slate-900 text-white" : d === now ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "hover:bg-slate-100",
                  !isSelected && !inMonth(d) && "text-slate-300",
                )}
              >
                {parseISODate(d).getDate()}
                <span className={cn("h-1.5 rounded-full", count === 0 ? "w-0" : count === 1 ? "w-1.5" : "w-4", isSelected ? "bg-white" : "bg-blue-500")} />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---------- Listes ----------

function AppointmentRow({ a, showDate, onEdit }: { a: Appointment; showDate?: boolean; onEdit: () => void }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const toggle = useAction(() => api(`/api/appointments/${a.id}`, "PUT", { ...toInput(a), done: !a.done }));
  const remove = useAction(() => api(`/api/appointments/${a.id}`, "DELETE"));
  const markDone = () =>
    toggle.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast.success("Rendez-vous marqué comme terminé");
      },
      onError: toast.error,
    });
  return (
    <li className="flex items-start gap-3 py-3">
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title={<ModalTitle icon={<Check className="size-5" />} title="Rendez-vous terminé ?" subtitle="Confirmez que ce rendez-vous a bien eu lieu" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button variant="success" icon={<Check className="size-5" />} loading={toggle.isPending} onClick={markDone}>
              Oui, terminé
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-bold text-blue-700">
            {dayLabel(a.date)}
            {a.time && ` · ${a.time}`}
          </div>
          <div className="font-semibold text-slate-900">{a.title}</div>
          {a.clientName && <div className="text-sm text-slate-600">{a.clientName}</div>}
        </div>
        <p className="mt-3 text-sm text-slate-500">Il restera visible dans l'agenda, barré, et ne sera plus compté dans les rendez-vous à venir.</p>
      </Modal>
      <button
        type="button"
        onClick={() => (a.done ? toggle.mutate(undefined, { onError: toast.error }) : setConfirming(true))}
        title={a.done ? "Marquer comme à faire" : "Marquer comme fait"}
        aria-label={a.done ? "Marquer comme à faire" : "Marquer comme fait"}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          a.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-500",
        )}
      >
        {a.done && <Check className="size-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {(showDate || a.time) && (
            <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-blue-700">
              {showDate ? dayLabel(a.date, true) : <Clock className="size-3.5" />}
              {a.time && `${showDate ? " · " : ""}${a.time}`}
            </span>
          )}
          <span className={cn("font-semibold text-slate-900", a.done && "text-slate-400 line-through")}>{a.title}</span>
        </div>
        {(a.clientName || a.plate) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {a.clientId && a.clientName && (
              <Link to={`/clients/${a.clientId}`} className="font-medium hover:text-blue-700 hover:underline">
                {a.clientName}
              </Link>
            )}
            {a.clientPhone && (
              <a href={`tel:${a.clientPhone}`} className="inline-flex items-center gap-1 hover:text-blue-700">
                <Phone className="size-3.5" /> {a.clientPhone}
              </a>
            )}
            {a.plate && (
              <span className="inline-flex items-center gap-2">
                <PlateBadge plate={a.plate} />
                {a.vehicleLabel && <span className="text-slate-500">{a.vehicleLabel}</span>}
              </span>
            )}
          </div>
        )}
        {a.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{a.notes}</p>}
        {a.reminderValue && !a.done && (
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <Bell className="size-3.5" /> Rappel {reminderDelay(a.reminderValue, a.reminderUnit)} avant
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="ghost" title="Modifier" aria-label="Modifier" icon={<Pencil className="size-4" />} onClick={onEdit} />
        <ConfirmButton
          size="sm"
          variant="ghost"
          title="Supprimer"
          icon={<Trash2 className="size-4" />}
          message="Supprimer ce rendez-vous ?"
          onConfirm={() => remove.mutate(undefined, { onSuccess: () => toast.success("Rendez-vous supprimé"), onError: toast.error })}
        />
      </div>
    </li>
  );
}

// ---------- Page ----------

export function AgendaPage() {
  const now = today();
  const [month, setMonth] = useState(`${now.slice(0, 7)}-01`);
  const [selected, setSelected] = useState(now);
  const [editing, setEditing] = useState<Appointment | null | "new">(null);

  const grid = monthGrid(month);
  const { data: monthItems } = useApi<Appointment[]>(`/api/appointments?from=${grid[0]}&to=${grid[grid.length - 1]}`);
  const { data: dayItems } = useApi<Appointment[]>(`/api/appointments?from=${selected}&to=${selected}`);
  const { data: upcoming } = useApi<Appointment[]>(`/api/appointments?from=${addDays(now, 1)}&to=${addMonths(now, 3)}`);

  const counts = new Map<string, number>();
  for (const a of monthItems ?? []) if (!a.done) counts.set(a.date, (counts.get(a.date) ?? 0) + 1);
  const next = (upcoming ?? []).filter((a) => !a.done);

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Rendez-vous et événements à venir"
        actions={
          <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
            Nouveau rendez-vous
          </Button>
        }
      />

      <div className="@container">
        <div className="grid items-start gap-5 @3xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @5xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <MonthCalendar month={month} onMonth={setMonth} selected={selected} onSelect={setSelected} counts={counts} />

          <div className="flex min-w-0 flex-col gap-5">
            <RemindersPanel
              onOpen={(a) => {
                setSelected(a.date);
                setMonth(`${a.date.slice(0, 7)}-01`);
              }}
            />
            <Card
              title={
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-slate-400" />
                  {dayLabel(selected)}
                  {selected === now || selected === addDays(now, 1) ? (
                    <span className="text-base font-normal text-slate-500">
                      · {parseISODate(selected).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  ) : null}
                </span>
              }
              actions={
                <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
                  Ajouter
                </Button>
              }
            >
              {!dayItems ? (
                <Spinner />
              ) : dayItems.length === 0 ? (
                <EmptyState icon={<CalendarDays className="size-8 text-slate-300" />}>Aucun rendez-vous ce jour-là</EmptyState>
              ) : (
                <ul className="-my-3 divide-y divide-slate-100">
                  {dayItems.map((a) => (
                    <AppointmentRow key={a.id} a={a} onEdit={() => setEditing(a)} />
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  Prochains jours
                  <span className="text-base font-normal text-slate-500">· 3 prochains mois{next.length > 0 && ` (${next.length})`}</span>
                </span>
              }
            >
              {!upcoming ? (
                <Spinner />
              ) : next.length === 0 ? (
                <div className="py-4 text-center text-slate-500">Rien de prévu pour les 3 prochains mois</div>
              ) : (
                <ul className="-my-3 divide-y divide-slate-100">
                  {next.map((a) => (
                    <AppointmentRow key={a.id} a={a} showDate onEdit={() => setEditing(a)} />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>

      <AppointmentModal open={editing !== null} onClose={() => setEditing(null)} appointment={editing === "new" ? null : editing} date={selected} />
    </>
  );
}
