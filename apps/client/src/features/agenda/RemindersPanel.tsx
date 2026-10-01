import { Link } from "react-router";
import { ArrowRight, Bell, Check } from "lucide-react";
import { addDays, today, type Appointment } from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { useToast } from "../../components/Toast";
import { Button } from "../../components/ui";
import { dayLabel, untilLabel } from "./format";

/** Rappels du jour ; ne s'affiche que s'il y en a. Sur l'agenda, cliquer un rappel ouvre le jour du rendez-vous. */
export function RemindersPanel({ onOpen }: { onOpen?: (a: Appointment) => void }) {
  const toast = useToast();
  const { data } = useApi<Appointment[]>("/api/appointments/reminders", { refetchInterval: 60000 });
  const dismiss = useAction((id: number) => api(`/api/appointments/${id}/dismiss-reminder`, "POST"));
  if (!data?.length) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900">
          <Bell className="size-5 text-amber-600" />
          Rappels
          <span className="rounded-full bg-amber-200/70 px-2 text-sm tabular-nums">{data.length}</span>
        </h2>
        {!onOpen && (
          <Link to="/agenda" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:underline">
            Voir l'agenda <ArrowRight className="size-4" />
          </Link>
        )}
      </header>
      <ul className="divide-y divide-amber-200/70">
        {data.map((a) => {
          const body = (
            <>
              <div className="text-sm font-bold text-amber-700">
                {untilLabel(a.date)}
                {a.date > addDays(today(), 1) && ` · ${dayLabel(a.date, true)}`}
                {a.time && ` · ${a.time}`}
              </div>
              <div className="font-semibold text-slate-900">{a.title}</div>
              {(a.clientName || a.plate) && <div className="text-sm text-slate-600">{[a.clientName, a.clientPhone, a.plate].filter(Boolean).join(" · ")}</div>}
            </>
          );
          return (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              {onOpen ? (
                <button type="button" onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left hover:opacity-80">
                  {body}
                </button>
              ) : (
                <div className="min-w-0 flex-1">{body}</div>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon={<Check className="size-4" />}
                title="Ne plus afficher ce rappel"
                loading={dismiss.isPending && dismiss.variables === a.id}
                onClick={() => dismiss.mutate(a.id, { onError: toast.error })}
              >
                Vu
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
