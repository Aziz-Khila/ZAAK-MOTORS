import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Hammer, Landmark, Pencil, Plus, Trash2, TrendingDown, Truck } from "lucide-react";
import {
  INVESTMENT_CATEGORIES,
  formatDate,
  formatMoney,
  investmentCategoryLabel,
  today,
  type Investment,
  type InvestmentInput,
} from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { FormSection, IconInput, ModalTitle } from "../../components/forms";
import { IntInput, MoneyInput } from "../../components/inputs";
import { ListPanel, listTd as td, listTh as th, RowIcon } from "../../components/list";
import { SummaryTile } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import { Button, ConfirmButton, EmptyState, Field, Input, Modal, Select, Spinner, Textarea, cn } from "../../components/ui";

const empty = (): Required<InvestmentInput> => ({
  designation: "",
  category: "outillage",
  purchaseDate: today(),
  price: 0,
  supplier: "",
  lifetimeMonths: 60,
  notes: "",
});

function InvestmentModal({ open, onClose, investment }: { open: boolean; onClose: () => void; investment: Investment | null }) {
  const toast = useToast();
  const [form, setForm] = useState(empty());
  useEffect(() => {
    if (open) setForm(investment ? { ...investment } : empty());
  }, [open, investment]);
  const save = useAction((data: InvestmentInput) =>
    investment ? api(`/api/investments/${investment.id}`, "PUT", data) : api("/api/investments", "POST", data),
  );
  const set = <K extends keyof InvestmentInput>(k: K, v: InvestmentInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const years = form.lifetimeMonths ? form.lifetimeMonths / 12 : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <ModalTitle
          icon={investment ? <Pencil className="size-5" /> : <Hammer className="size-5" />}
          title={investment ? "Modifier l'investissement" : "Nouvel investissement"}
          subtitle="Matériel durable : pont, compresseur, outillage…"
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
                  toast.success("Investissement enregistré");
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
      <div className="space-y-6">
        <FormSection title="Équipement">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Désignation" required className="sm:col-span-2">
              <IconInput icon={<Hammer className="size-4" />} value={form.designation} autoFocus placeholder="Ex. : Pont élévateur 2 colonnes" onChange={(e) => set("designation", e.target.value)} />
            </Field>
            <Field label="Catégorie">
              <Select value={form.category} options={INVESTMENT_CATEGORIES} onChange={(e) => set("category", e.target.value)} />
            </Field>
            <Field label="Fournisseur">
              <IconInput icon={<Truck className="size-4" />} value={form.supplier} placeholder="Nom du fournisseur" onChange={(e) => set("supplier", e.target.value)} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Achat et amortissement">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix d'achat" required>
              <MoneyInput value={form.price} onChange={(v) => set("price", v ?? 0)} />
            </Field>
            <Field label="Date d'achat">
              <Input type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
            </Field>
            <Field label="Durée d'utilisation estimée">
              <IntInput value={form.lifetimeMonths} onChange={(v) => set("lifetimeMonths", v)} suffix="mois" />
            </Field>
          </div>
          {years && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>
                Soit {years.toLocaleString("fr-FR")} an(s) d'utilisation
              </span>
              <span className="font-bold tabular-nums">{formatMoney(Math.round(form.price / form.lifetimeMonths!))} par mois</span>
            </div>
          )}
        </FormSection>

        <FormSection title="Notes">
          <Textarea value={form.notes} rows={2} placeholder="Garantie, numéro de série, entretien…" onChange={(e) => set("notes", e.target.value)} />
        </FormSection>
      </div>
    </Modal>
  );
}

export function InvestmentsSection({ header }: { header: (actions: ReactNode) => ReactNode }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Investment | null | "new">(null);
  const { data } = useApi<Investment[]>("/api/investments");
  const remove = useAction((id: number) => api(`/api/investments/${id}`, "DELETE"));

  const total = data?.reduce((s, i) => s + i.price, 0) ?? 0;
  const isRunning = (i: Investment) => {
    if (!i.lifetimeMonths) return false;
    const end = new Date(i.purchaseDate);
    end.setMonth(end.getMonth() + i.lifetimeMonths);
    return end > new Date();
  };
  const monthly = data?.reduce((s, i) => (isRunning(i) ? s + Math.round(i.price / i.lifetimeMonths!) : s), 0) ?? 0;
  const running = data?.filter(isRunning).length ?? 0;

  return (
    <>
      {header(
        <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
          Nouvel investissement
        </Button>,
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryTile icon={<Landmark className="size-5" />} label="Total investi" value={formatMoney(total)} tone="text-blue-700" hint={`${data?.length ?? 0} équipement(s)`} />
        <SummaryTile
          icon={<TrendingDown className="size-5" />}
          label="Amortissement mensuel (indicatif)"
          value={formatMoney(monthly)}
          tone="text-amber-600"
          hint="Prix d'achat ÷ durée d'utilisation"
        />
        <SummaryTile icon={<CalendarClock className="size-5" />} label="En cours d'amortissement" value={running} hint={`sur ${data?.length ?? 0} équipement(s)`} />
      </div>

      <ListPanel>
        {!data ? (
          <Spinner />
        ) : data.length === 0 ? (
          <EmptyState icon={<Hammer className="size-10 text-slate-300" />}>
            <div className="space-y-3">
              <div>Aucun investissement enregistré</div>
              <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
                Ajouter un investissement
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className={th}>Équipement</th>
                  <th className={th}>Date d'achat</th>
                  <th className={th}>Durée</th>
                  <th className={cn(th, "text-right")}>Par mois</th>
                  <th className={cn(th, "text-right")}>Prix</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((i) => (
                  <tr key={i.id} className="transition-colors hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <RowIcon>
                          <Hammer className="size-5" />
                        </RowIcon>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{i.designation}</div>
                          <div className="text-xs text-slate-500">
                            {investmentCategoryLabel(i.category)}
                            {i.supplier && ` · ${i.supplier}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={cn(td, "text-slate-600")}>{formatDate(i.purchaseDate)}</td>
                    <td className={td}>
                      {i.lifetimeMonths ? (
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isRunning(i) ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>
                          {i.lifetimeMonths} mois{isRunning(i) ? "" : " · amorti"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-right tabular-nums text-slate-600")}>
                      {i.lifetimeMonths ? formatMoney(Math.round(i.price / i.lifetimeMonths)) : "—"}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold tabular-nums text-slate-900")}>{formatMoney(i.price)}</td>
                    <td className={cn(td, "whitespace-nowrap text-right")}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Modifier" aria-label="Modifier" icon={<Pencil className="size-4" />} onClick={() => setEditing(i)} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          title="Supprimer"
                          icon={<Trash2 className="size-4" />}
                          message="Supprimer cet investissement ?"
                          onConfirm={() => remove.mutate(i.id, { onSuccess: () => toast.success("Investissement supprimé"), onError: toast.error })}
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
      <InvestmentModal open={editing !== null} onClose={() => setEditing(null)} investment={editing === "new" ? null : editing} />
    </>
  );
}
