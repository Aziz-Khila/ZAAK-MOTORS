import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Check, Clock, FileText, Lock, Package, Printer, Receipt, Save, Trash2, Wrench, X } from "lucide-react";
import { computeTotals, formatDate, formatMoney, formatQuantity, today, type InvoiceDetail, type Line, type QuoteDetail, type QuoteStatus } from "@garage/shared";
import { api, useAction, useApi, useSettings } from "../../api";
import { LinesEditor } from "../../components/LinesEditor";
import { QuoteStatusBadge } from "../../components/StatusBadge";
import { Kpi } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import { Button, Card, ConfirmButton, ErrorBox, Field, Input, LinkButton, PageHeader, Spinner, Textarea } from "../../components/ui";
import { DocumentParties, Notice } from "../documents";

interface Form {
  date: string;
  validUntil: string | null;
  notes: string;
  lines: Line[];
}

const DAY = 86_400_000;

function validityHint(validUntil: string | null) {
  if (!validUntil) return "Sans date limite";
  const days = Math.round((Date.parse(validUntil) - Date.parse(today())) / DAY);
  if (days < 0) return `Expiré depuis ${-days} jour(s)`;
  if (days === 0) return "Expire aujourd'hui";
  return `Encore ${days} jour(s) de validité`;
}

export function QuotePage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: settings } = useSettings();
  const { data: q, isLoading, error } = useApi<QuoteDetail>(`/api/quotes/${id}`);
  const [form, setForm] = useState<Form | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (q && !dirty) setForm({ date: q.date, validUntil: q.validUntil, notes: q.notes, lines: q.lines });
  }, [q, dirty]);

  const save = useAction((f: Form) =>
    api(`/api/quotes/${id}`, "PUT", { clientId: q!.clientId, vehicleId: q!.vehicleId, ...f }),
  );
  const setStatus = useAction((status: QuoteStatus) => api(`/api/quotes/${id}/status`, "PATCH", { status }));
  const invoice = useAction(() => api<InvoiceDetail>(`/api/quotes/${id}/invoice`, "POST"));
  const remove = useAction(() => api(`/api/quotes/${id}`, "DELETE"));

  if (error) return <ErrorBox error={error} />;
  if (isLoading || !q || !form) return <Spinner />;

  const locked = !!q.invoiceId;
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

  const totals = computeTotals(form.lines, {
    vatEnabled: settings?.vatEnabled ?? false,
    vatRate: settings?.vatRate ?? 0,
    stampEnabled: settings?.stampEnabled ?? false,
    stampAmount: settings?.stampAmount ?? 0,
  });
  const hours = form.lines.filter((l) => l.type === "main_oeuvre").reduce((s, l) => s + (l.quantity || 0), 0);
  const partLines = form.lines.filter((l) => l.type === "piece").length;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Devis {q.number} <QuoteStatusBadge status={q.status} />
          </span>
        }
        subtitle={`Du ${formatDate(q.date)}`}
        actions={
          <>
            {q.status !== "accepte" && (
              <Button variant="success" icon={<Check className="size-5" />} onClick={() => run(() => setStatus.mutateAsync("accepte"), "Devis accepté")}>
                Accepté
              </Button>
            )}
            {q.status !== "refuse" && !locked && (
              <Button variant="danger" icon={<X className="size-5" />} onClick={() => run(() => setStatus.mutateAsync("refuse"), "Devis refusé")}>
                Refusé
              </Button>
            )}
            {q.status !== "en_attente" && !locked && (
              <Button variant="secondary" icon={<Clock className="size-5" />} onClick={() => run(() => setStatus.mutateAsync("en_attente"), "Devis remis en attente")}>
                En attente
              </Button>
            )}
            {q.invoiceId ? (
              <LinkButton to={`/factures/${q.invoiceId}`} icon={<Receipt className="size-5" />}>
                Voir la facture
              </LinkButton>
            ) : (
              q.status !== "refuse" && (
                <Button
                  icon={<Receipt className="size-5" />}
                  loading={invoice.isPending}
                  onClick={() =>
                    run(async () => {
                      const f = await invoice.mutateAsync();
                      navigate(`/factures/${f.id}`);
                    })
                  }
                >
                  Transformer en facture
                </Button>
              )
            )}
            <Button
              variant="secondary"
              icon={<Printer className="size-5" />}
              onClick={() => run(async () => window.open(`/imprimer/devis/${id}`, "_blank"))}
            >
              Imprimer
            </Button>
          </>
        }
      />

      {locked && (
        <Notice tone="green" icon={<Lock />}>
          Ce devis a été transformé en facture : il n'est plus modifiable.
        </Notice>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <DocumentParties client={q.client} vehicle={q.vehicle} />

        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi
              icon={<FileText className="size-4" />}
              label="Montant du devis"
              value={formatMoney(dirty ? totals.total : q.total)}
              tone="text-blue-700"
              hint={`${form.lines.length} ligne(s)`}
            />
            <Kpi
              icon={<Wrench className="size-4" />}
              label="Main-d'œuvre"
              value={formatMoney(totals.labor)}
              tone="text-slate-900"
              hint={hours > 0 ? `${formatQuantity(hours)} h de travail` : "Aucune main-d'œuvre"}
            />
            <Kpi
              icon={<Package className="size-4" />}
              label="Pièces et prestations"
              value={formatMoney(totals.parts + totals.services)}
              tone="text-slate-900"
              hint={`${partLines} pièce(s)`}
            />
          </div>

          <Card title="Informations" className="flex-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date du devis">
                <Input type="date" value={form.date} disabled={locked} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Valable jusqu'au" hint={validityHint(form.validUntil)}>
                <Input type="date" value={form.validUntil ?? ""} disabled={locked} onChange={(e) => update({ validUntil: e.target.value || null })} />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <Card
        title="Détail du devis"
        className="mb-5"
        actions={
          !locked && (
            <Button icon={<Save className="size-5" />} disabled={!dirty} loading={save.isPending} onClick={() => run(async () => {}, "Devis enregistré")}>
              {dirty ? "Enregistrer" : "Enregistré"}
            </Button>
          )
        }
      >
        <LinesEditor lines={form.lines} onChange={(lines) => update({ lines })} readOnly={locked} />
        <Field label="Notes (imprimées sur le devis)" className="mt-4">
          <Textarea value={form.notes} rows={2} disabled={locked} onChange={(e) => update({ notes: e.target.value })} />
        </Field>
      </Card>

      {!locked && (
        <div className="flex justify-end">
          <ConfirmButton
            variant="ghost"
            icon={<Trash2 className="size-5" />}
            message="Supprimer ce devis ?"
            onConfirm={() =>
              remove.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Devis supprimé");
                  navigate("/devis");
                },
                onError: toast.error,
              })
            }
          >
            Supprimer le devis
          </ConfirmButton>
        </div>
      )}
    </>
  );
}
