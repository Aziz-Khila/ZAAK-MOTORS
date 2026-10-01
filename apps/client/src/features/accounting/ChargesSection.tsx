import { useEffect, useState, type ReactNode } from "react";
import { Building2, CalendarClock, Coins, Info, Pencil, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import {
  FIXED_CHARGE_CATEGORIES,
  FREQUENCIES,
  VARIABLE_CHARGE_CATEGORIES,
  chargeCategoryLabel,
  formatDate,
  formatMoney,
  frequencyLabel,
  monthlyEquivalent,
  today,
  type Charge,
  type ChargeInput,
  type Frequency,
} from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { FormSection, IconInput, ModalTitle } from "../../components/forms";
import { MoneyInput } from "../../components/inputs";
import { FilterPills, ListPanel, listTd as td, listTh as th, RowIcon } from "../../components/list";
import { SummaryTile } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import { Badge, Button, ConfirmButton, EmptyState, Field, Input, Modal, Select, Spinner, Textarea, cn } from "../../components/ui";

type Kind = "fixe" | "variable";

const emptyCharge = (kind: Kind): Required<ChargeInput> => ({
  label: "",
  kind,
  category: kind === "fixe" ? "loyer" : "consommables",
  amount: 0,
  frequency: kind === "fixe" ? "mensuelle" : "ponctuelle",
  startDate: today(),
  endDate: null,
  supplier: "",
  notes: "",
});

function ChargeModal({ open, onClose, charge, kind }: { open: boolean; onClose: () => void; charge: Charge | null; kind: Kind }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyCharge(kind));
  useEffect(() => {
    if (open) setForm(charge ? { ...emptyCharge(charge.kind), ...charge, frequency: charge.frequency as Frequency } : emptyCharge(kind));
  }, [open, charge, kind]);
  const save = useAction((data: ChargeInput) => (charge ? api(`/api/charges/${charge.id}`, "PUT", data) : api("/api/charges", "POST", data)));
  const set = <K extends keyof ChargeInput>(k: K, v: ChargeInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const categories = form.kind === "fixe" ? FIXED_CHARGE_CATEGORIES : VARIABLE_CHARGE_CATEGORIES;

  const submit = () =>
    save.mutate(
      { ...form, label: form.label.trim() || chargeCategoryLabel(form.category) },
      {
        onSuccess: () => {
          toast.success("Charge enregistrée");
          onClose();
        },
        onError: toast.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <ModalTitle
          icon={charge ? <Pencil className="size-5" /> : form.kind === "fixe" ? <Building2 className="size-5" /> : <ShoppingCart className="size-5" />}
          title={charge ? "Modifier la charge" : form.kind === "fixe" ? "Nouvelle charge fixe" : "Nouvelle dépense variable"}
          subtitle={form.kind === "fixe" ? "Loyer, salaires, abonnements… payés régulièrement" : "Consommables, sous-traitance, transport…"}
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
      <div className="space-y-6">
        <FormSection title="Charge">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <Select value={form.category} options={categories} onChange={(e) => set("category", e.target.value)} />
            </Field>
            <Field label="Libellé" hint="Facultatif : la catégorie est utilisée par défaut">
              <Input value={form.label} placeholder={chargeCategoryLabel(form.category)} onChange={(e) => set("label", e.target.value)} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Montant et fréquence">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Fréquence</span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Fréquence">
                {FREQUENCIES.map((f) => {
                  const active = form.frequency === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set("frequency", f.value)}
                      className={cn(
                        "h-11 rounded-xl border px-3 text-sm font-semibold transition",
                        active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Montant" required>
              <MoneyInput value={form.amount} autoFocus onChange={(v) => set("amount", v ?? 0)} />
            </Field>
            <Field label={form.frequency === "ponctuelle" ? "Date" : "Première échéance"}>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            {form.frequency !== "ponctuelle" && (
              <Field label="Fin (facultatif)" hint="Laisser vide si la charge continue">
                <Input type="date" value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} />
              </Field>
            )}
          </div>
        </FormSection>

        <FormSection title="Fournisseur et notes">
          <div className="space-y-4">
            <Field label="Fournisseur">
              <IconInput
                icon={<Truck className="size-4" />}
                value={form.supplier}
                placeholder="Nom du fournisseur ou du bénéficiaire"
                onChange={(e) => set("supplier", e.target.value)}
              />
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} rows={2} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </FormSection>
      </div>
    </Modal>
  );
}

const TAB_HINTS: Record<Kind, string> = {
  fixe: "Charges payées régulièrement (loyer, salaires, abonnements…). Le total mensuel est calculé en équivalent mensuel.",
  variable:
    "Consommables, huiles en vrac, sous-traitance, transport… Les pièces vendues sur facture sont comptées automatiquement avec leur prix d'achat : inutile de les saisir ici.",
};

export function ChargesSection({ header }: { header: (actions: ReactNode) => ReactNode }) {
  const toast = useToast();
  const [tab, setTab] = useState<Kind>("fixe");
  const [editing, setEditing] = useState<Charge | null | "new">(null);
  const { data: fixed } = useApi<Charge[]>("/api/charges?kind=fixe");
  const { data: variable } = useApi<Charge[]>("/api/charges?kind=variable");
  const removeCharge = useAction((id: number) => api(`/api/charges/${id}`, "DELETE"));

  const charges = tab === "fixe" ? fixed : variable;
  const activeFixed = fixed?.filter((c) => c.frequency !== "ponctuelle" && (!c.endDate || c.endDate >= today())) ?? [];
  const monthlyTotal = activeFixed.reduce((s, c) => s + monthlyEquivalent({ amount: c.amount, frequency: c.frequency as Frequency }), 0);
  const variableTotal = variable?.reduce((s, c) => s + c.amount, 0) ?? 0;

  return (
    <>
      {header(
        <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
          {tab === "fixe" ? "Nouvelle charge fixe" : "Nouvelle dépense"}
        </Button>,
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryTile
          icon={<Building2 className="size-5" />}
          label="Charges fixes en cours"
          value={`${formatMoney(monthlyTotal)} / mois`}
          tone="text-blue-700"
          hint={`${activeFixed.length} charge(s) active(s), en équivalent mensuel`}
        />
        <SummaryTile
          icon={<ShoppingCart className="size-5" />}
          label="Dépenses variables"
          value={formatMoney(variableTotal)}
          hint={`${variable?.length ?? 0} dépense(s) enregistrée(s)`}
        />
      </div>

      <ListPanel
        toolbar={
          <>
            <FilterPills
              value={tab}
              onChange={setTab}
              options={[
                { value: "fixe", label: "Charges fixes", count: fixed?.length },
                { value: "variable", label: "Charges variables", count: variable?.length },
              ]}
            />
            <p className="flex items-start gap-2 px-1 text-sm text-slate-500">
              <Info className="mt-0.5 size-4 shrink-0" />
              {TAB_HINTS[tab]}
            </p>
          </>
        }
      >
        {!charges ? (
          <Spinner />
        ) : charges.length === 0 ? (
          <EmptyState icon={<Coins className="size-10 text-slate-300" />}>Aucune charge enregistrée</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className={th}>Charge</th>
                  <th className={th}>Fréquence</th>
                  <th className={th}>Date / période</th>
                  <th className={cn(th, "text-right")}>Montant</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charges.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <RowIcon>{c.kind === "fixe" ? <Building2 className="size-5" /> : <ShoppingCart className="size-5" />}</RowIcon>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{c.label}</div>
                          <div className="text-xs text-slate-500">
                            {chargeCategoryLabel(c.category)}
                            {c.supplier && ` · ${c.supplier}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <Badge color={c.frequency === "ponctuelle" ? "slate" : "blue"} className="text-xs">
                        {frequencyLabel(c.frequency)}
                      </Badge>
                    </td>
                    <td className={cn(td, "text-slate-600")}>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-4 text-slate-400" />
                        {c.frequency === "ponctuelle" ? formatDate(c.startDate) : `depuis le ${formatDate(c.startDate)}`}
                        {c.endDate && ` jusqu'au ${formatDate(c.endDate)}`}
                      </span>
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold tabular-nums text-slate-900")}>{formatMoney(c.amount)}</td>
                    <td className={cn(td, "whitespace-nowrap text-right")}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Modifier" aria-label="Modifier" icon={<Pencil className="size-4" />} onClick={() => setEditing(c)} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          title="Supprimer"
                          icon={<Trash2 className="size-4" />}
                          message="Supprimer cette charge ?"
                          onConfirm={() => removeCharge.mutate(c.id, { onSuccess: () => toast.success("Charge supprimée"), onError: toast.error })}
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

      <ChargeModal open={editing !== null} onClose={() => setEditing(null)} charge={editing === "new" ? null : editing} kind={tab} />
    </>
  );
}
