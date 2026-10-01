import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Info, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { formatDate, formatMoney, today, type Revenue, type RevenueInput } from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { ModalTitle } from "../../components/forms";
import { MoneyInput } from "../../components/inputs";
import { ListPanel, listTd as td, listTh as th, RowIcon } from "../../components/list";
import { SummaryTile } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import { Button, ConfirmButton, EmptyState, Field, Input, Modal, Spinner, Textarea, cn } from "../../components/ui";

function RevenueModal({ open, onClose, revenue }: { open: boolean; onClose: () => void; revenue: Revenue | null }) {
  const toast = useToast();
  const empty = (): Required<RevenueInput> => ({ label: "", amount: 0, date: today(), notes: "" });
  const [form, setForm] = useState(empty());
  useEffect(() => {
    if (open) setForm(revenue ? { ...revenue } : empty());
  }, [open, revenue]);
  const save = useAction((data: RevenueInput) => (revenue ? api(`/api/revenues/${revenue.id}`, "PUT", data) : api("/api/revenues", "POST", data)));
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        <ModalTitle
          icon={revenue ? <Pencil className="size-5" /> : <TrendingUp className="size-5" />}
          title={revenue ? "Modifier le revenu" : "Autre revenu"}
          subtitle="Recette hors factures clients"
        />
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={save.isPending}
            onClick={() =>
              save.mutate(form, {
                onSuccess: () => {
                  toast.success("Revenu enregistré");
                  onClose();
                },
                onError: toast.error,
              })
            }
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Libellé" required>
          <Input value={form.label} autoFocus placeholder="Ex. : vente de ferraille, location de pont…" onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant">
            <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v ?? 0 })} />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

export function RevenuesSection({ header }: { header: (actions: ReactNode) => ReactNode }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Revenue | null | "new">(null);
  const { data: revenues } = useApi<Revenue[]>("/api/revenues");
  const remove = useAction((id: number) => api(`/api/revenues/${id}`, "DELETE"));

  const total = revenues?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const thisMonth = revenues?.filter((r) => r.date.startsWith(today().slice(0, 7))) ?? [];
  const monthTotal = thisMonth.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      {header(
        <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
          Autre revenu
        </Button>,
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryTile
          icon={<TrendingUp className="size-5" />}
          label="Autres revenus"
          value={formatMoney(total)}
          tone="text-emerald-700"
          hint={`${revenues?.length ?? 0} revenu(s) enregistré(s)`}
        />
        <SummaryTile icon={<CalendarDays className="size-5" />} label="Ce mois-ci" value={formatMoney(monthTotal)} hint={`${thisMonth.length} revenu(s) ce mois-ci`} />
      </div>

      <ListPanel
        toolbar={
          <p className="flex items-start gap-2 px-1 text-sm text-slate-500">
            <Info className="mt-0.5 size-4 shrink-0" />
            Recettes qui ne passent pas par une facture client : vente de ferraille, location de pont…
          </p>
        }
      >
        {!revenues ? (
          <Spinner />
        ) : revenues.length === 0 ? (
          <EmptyState icon={<TrendingUp className="size-10 text-slate-300" />}>Aucun autre revenu</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className={th}>Libellé</th>
                  <th className={th}>Date</th>
                  <th className={cn(th, "text-right")}>Montant</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenues.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <RowIcon tone="bg-emerald-50 text-emerald-600">
                          <TrendingUp className="size-5" />
                        </RowIcon>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{r.label}</div>
                          {r.notes && <div className="truncate text-xs text-slate-500">{r.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td className={cn(td, "text-slate-600")}>{formatDate(r.date)}</td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold tabular-nums text-emerald-700")}>{formatMoney(r.amount)}</td>
                    <td className={cn(td, "whitespace-nowrap text-right")}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Modifier" aria-label="Modifier" icon={<Pencil className="size-4" />} onClick={() => setEditing(r)} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          title="Supprimer"
                          icon={<Trash2 className="size-4" />}
                          message="Supprimer ce revenu ?"
                          onConfirm={() => remove.mutate(r.id, { onSuccess: () => toast.success("Revenu supprimé"), onError: toast.error })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListPanel>

      <RevenueModal open={editing !== null} onClose={() => setEditing(null)} revenue={editing === "new" ? null : editing} />
    </>
  );
}
