import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertCircle, Ban, BadgeCheck, Banknote, FilePen, Printer, Receipt, Save, Trash2, Wallet } from "lucide-react";
import {
  PAYMENT_METHODS,
  formatDate,
  formatMoney,
  paymentMethodLabel,
  today,
  type InvoiceDetail,
  type Line,
  type PaymentMethod,
} from "@garage/shared";
import { api, useAction, useApi, useSettings } from "../../api";
import { IntInput, MoneyInput } from "../../components/inputs";
import { LinesEditor, TotalsBox } from "../../components/LinesEditor";
import { InvoiceStatusBadge } from "../../components/StatusBadge";
import { Kpi } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import { Button, Card, ConfirmButton, ErrorBox, Field, Input, PageHeader, Spinner, Textarea, cn } from "../../components/ui";
import { DocumentParties, Notice } from "../documents";

interface Form {
  date: string;
  dueDate: string | null;
  mileage: number | null;
  workDone: string;
  notes: string;
  lines: Line[];
}

function PaymentBox({ invoice }: { invoice: InvoiceDetail }) {
  const toast = useToast();
  const remaining = invoice.total - invoice.paid;
  const [amount, setAmount] = useState<number | null>(remaining);
  const [method, setMethod] = useState<PaymentMethod>("especes");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  useEffect(() => setAmount(remaining), [remaining]);

  const add = useAction((body: { amount: number; method: string; date: string; notes: string }) =>
    api(`/api/invoices/${invoice.id}/payments`, "POST", body),
  );
  const remove = useAction((paymentId: number) => api(`/api/payments/${paymentId}`, "DELETE"));

  const pay = (value: number) =>
    add.mutate(
      { amount: value, method, date, notes },
      {
        onSuccess: () => {
          toast.success("Paiement enregistré");
          setNotes("");
        },
        onError: toast.error,
      },
    );

  return (
    <Card title="Paiements">
      {invoice.payments.length > 0 ? (
        <ul className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {invoice.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Banknote className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold tabular-nums text-slate-900">{formatMoney(p.amount)}</div>
                <div className="truncate text-xs text-slate-500">
                  {paymentMethodLabel(p.method)} · {formatDate(p.date)}
                  {p.notes && <> · {p.notes}</>}
                </div>
              </div>
              <ConfirmButton
                size="sm"
                variant="ghost"
                icon={<Trash2 className="size-4" />}
                message="Supprimer ce paiement ?"
                onConfirm={() => remove.mutate(p.id, { onSuccess: () => toast.success("Paiement supprimé"), onError: toast.error })}
              />
            </li>
          ))}
        </ul>
      ) : (
        remaining > 0 && invoice.status !== "annulee" && <div className="mb-4 text-sm text-slate-500">Aucun paiement reçu pour l'instant.</div>
      )}

      {remaining > 0 && invoice.status !== "annulee" ? (
        <div className="space-y-4">
          <Button size="lg" variant="success" className="w-full" icon={<Banknote className="size-6" />} loading={add.isPending} onClick={() => pay(remaining)}>
            <span className="flex flex-col items-start leading-tight">
              <span>Encaisser la totalité</span>
              <span className="text-sm font-medium tabular-nums text-white/85">{formatMoney(remaining)}</span>
            </span>
          </Button>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ou paiement partiel <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-slate-700">Mode de paiement</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Mode de paiement">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={method === m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "h-10 rounded-xl border px-3.5 text-sm font-semibold transition",
                    method === m.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Montant (paiement partiel)" className="sm:col-span-2">
              <MoneyInput value={amount} onChange={setAmount} />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Note (n° chèque…)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <Button variant="secondary" className="w-full" disabled={!amount || amount <= 0} loading={add.isPending} onClick={() => amount && pay(amount)}>
            Enregistrer ce paiement
          </Button>
        </div>
      ) : invoice.status === "payee" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
          <BadgeCheck className="size-6" /> Facture entièrement payée
        </div>
      ) : null}
    </Card>
  );
}

export function InvoicePage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: settings } = useSettings();
  const { data: f, isLoading, error } = useApi<InvoiceDetail>(`/api/invoices/${id}`);
  const [form, setForm] = useState<Form | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (f && !dirty) setForm({ date: f.date, dueDate: f.dueDate, mileage: f.mileage, workDone: f.workDone, notes: f.notes, lines: f.lines });
  }, [f, dirty]);

  const save = useAction((form: Form) =>
    api(`/api/invoices/${id}`, "PUT", { clientId: f!.clientId, vehicleId: f!.vehicleId, quoteId: f!.quoteId, ...form }),
  );
  const validate = useAction(() => api(`/api/invoices/${id}/validate`, "POST"));
  const cancel = useAction(() => api(`/api/invoices/${id}/cancel`, "POST"));
  const remove = useAction(() => api(`/api/invoices/${id}`, "DELETE"));

  if (error) return <ErrorBox error={error} />;
  if (isLoading || !f || !form) return <Spinner />;

  const draft = f.status === "brouillon";
  const cancelled = f.status === "annulee";
  const update = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setDirty(true);
  };
  const persist = async () => {
    if (!dirty) return;
    await save.mutateAsync(form);
    setDirty(false);
  };
  const run = async (fn: () => Promise<unknown>, message?: string) => {
    try {
      await persist();
      await fn();
      if (message) toast.success(message);
    } catch (e) {
      toast.error(e);
    }
  };

  const remaining = f.total - f.paid;
  const overdue = !draft && !cancelled && remaining > 0 && !!f.dueDate && f.dueDate < today();

  const detail = (
    <Card
      title="Détail"
      actions={
        draft && (
          <Button icon={<Save className="size-5" />} disabled={!dirty} loading={save.isPending} onClick={() => run(async () => {}, "Facture enregistrée")}>
            {dirty ? "Enregistrer" : "Enregistré"}
          </Button>
        )
      }
    >
      <Field label="Travaux réalisés" className="mb-4">
        {draft ? (
          <Textarea value={form.workDone} rows={2} placeholder="Ex. : Vidange, remplacement des plaquettes…" onChange={(e) => update({ workDone: e.target.value })} />
        ) : (
          <div className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2.5 text-slate-800">{f.workDone || "—"}</div>
        )}
      </Field>
      <LinesEditor lines={form.lines} onChange={(lines) => update({ lines })} readOnly={!draft} showTotals={draft} />
      <Field label="Notes (imprimées sur la facture)" className="mt-4">
        <Textarea value={form.notes} rows={2} disabled={!draft} onChange={(e) => update({ notes: e.target.value })} />
      </Field>
    </Card>
  );

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Facture {f.number ?? "(brouillon)"} <InvoiceStatusBadge status={f.status} />
          </span>
        }
        subtitle={
          <>
            Du {formatDate(f.date)}
            {f.quoteNumber && (
              <>
                {" · devis "}
                <Link to={`/devis/${f.quoteId}`} className="font-semibold text-blue-700 hover:underline">
                  {f.quoteNumber}
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            {draft && (
              <Button variant="success" icon={<BadgeCheck className="size-5" />} loading={validate.isPending} onClick={() => run(() => validate.mutateAsync(), "Facture validée")}>
                Valider la facture
              </Button>
            )}
            <Button variant="secondary" icon={<Printer className="size-5" />} onClick={() => run(async () => window.open(`/imprimer/facture/${id}`, "_blank"))}>
              Imprimer
            </Button>
          </>
        }
      />

      {draft && (
        <Notice tone="amber" icon={<FilePen />}>
          Brouillon : vérifiez les lignes puis cliquez sur <strong>Valider la facture</strong>. Le numéro est attribué à la validation.
        </Notice>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <DocumentParties client={f.client} vehicle={f.vehicle} />

        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi icon={<Receipt className="size-4" />} label="Montant de la facture" value={formatMoney(f.total)} tone="text-blue-700" hint={`${f.lines.length} ligne(s)`} />
            <Kpi
              icon={<Wallet className="size-4" />}
              label="Déjà payé"
              value={draft || cancelled ? "—" : formatMoney(f.paid)}
              tone="text-emerald-700"
              hint={draft ? "Après validation" : cancelled ? "Facture annulée" : `${f.payments.length} paiement(s)`}
            />
            <Kpi
              icon={<AlertCircle className="size-4" />}
              label="Reste à payer"
              value={draft || cancelled ? "—" : formatMoney(remaining)}
              tone={remaining > 0 && !draft && !cancelled ? "text-red-600" : "text-emerald-700"}
              hint={
                draft
                  ? "Après validation"
                  : cancelled
                    ? "Facture annulée"
                    : remaining <= 0
                      ? "Facture réglée"
                      : f.dueDate
                        ? `${overdue ? "En retard depuis" : "Échéance"} le ${formatDate(f.dueDate)}`
                        : "Sans échéance"
              }
            />
          </div>

          <Card title="Informations" className="flex-1">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Date de facture">
                <Input type="date" value={form.date} disabled={!draft} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Échéance">
                <Input type="date" value={form.dueDate ?? ""} disabled={!draft} onChange={(e) => update({ dueDate: e.target.value || null })} />
              </Field>
              <Field label="Kilométrage">
                {draft ? (
                  <IntInput value={form.mileage} onChange={(v) => update({ mileage: v })} suffix="km" />
                ) : (
                  <div className="flex h-11 items-center rounded-xl bg-slate-100 px-3 font-semibold tabular-nums text-slate-700">
                    {f.mileage ? `${f.mileage.toLocaleString("fr-FR")} km` : "—"}
                  </div>
                )}
              </Field>
            </div>
          </Card>
        </div>
      </div>

      {draft ? (
        <div className="mb-5">{detail}</div>
      ) : (
        <div className="mb-5 grid gap-5 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">{detail}</div>
          <div className="space-y-5">
            <Card title="Récapitulatif">
              <TotalsBox
                subtotal={f.subtotal}
                vat={f.vat}
                vatRate={f.vatRate}
                stamp={f.stamp}
                total={f.total}
                vatEnabled={settings?.vatEnabled ?? false}
                paid={cancelled ? undefined : f.paid}
                plain
              />
            </Card>
            <PaymentBox invoice={f} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {draft ? (
          <ConfirmButton
            variant="ghost"
            icon={<Trash2 className="size-5" />}
            message="Supprimer ce brouillon de facture ?"
            onConfirm={() =>
              remove.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Brouillon supprimé");
                  navigate("/factures");
                },
                onError: toast.error,
              })
            }
          >
            Supprimer le brouillon
          </ConfirmButton>
        ) : (
          !cancelled && (
            <ConfirmButton
              variant="ghost"
              icon={<Ban className="size-5" />}
              message="Annuler cette facture ?"
              onConfirm={() => cancel.mutate(undefined, { onSuccess: () => toast.success("Facture annulée"), onError: toast.error })}
            >
              Annuler la facture
            </ConfirmButton>
          )
        )}
      </div>
    </>
  );
}
