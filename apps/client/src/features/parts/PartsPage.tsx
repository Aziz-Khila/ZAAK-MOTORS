import { useEffect, useState } from "react";
import { AlertTriangle, Car, Hash, Package, PackagePlus, Pencil, Plus, Tag, Trash2, TrendingUp, Truck } from "lucide-react";
import { formatMoney, salePriceFromMargin, unitMargin, type Part, type PartInput } from "@garage/shared";
import { api, buildQuery, useAction, useApi, useSettings } from "../../api";
import { FormSection, IconInput, ModalTitle } from "../../components/forms";
import { MoneyInput } from "../../components/inputs";
import { listTd as td, listTh as th, ListPanel, RowIcon, SearchField, useShowMore } from "../../components/list";
import { SummaryTile } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import { Button, ConfirmButton, EmptyState, ErrorBox, Field, Modal, PageHeader, Spinner, Textarea, cn } from "../../components/ui";

const emptyPart = (): Required<PartInput> => ({
  reference: "",
  designation: "",
  brand: "",
  supplier: "",
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 0,
  compatible: "",
  notes: "",
});

function MarginPill({ amount, percent }: { amount: number; percent: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
        amount < 0 ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200",
      )}
    >
      {percent} %
    </span>
  );
}

function PartFormModal({ open, onClose, part }: { open: boolean; onClose: () => void; part: Part | null }) {
  const toast = useToast();
  const { data: settings } = useSettings();
  const [form, setForm] = useState(emptyPart());
  useEffect(() => {
    if (open) setForm(part ? { ...emptyPart(), ...part } : emptyPart());
  }, [open, part]);
  const save = useAction((data: PartInput) => (part ? api(`/api/parts/${part.id}`, "PUT", data) : api("/api/parts", "POST", data)));
  const set = <K extends keyof PartInput>(k: K, v: PartInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const margin = unitMargin(form.salePrice, form.purchasePrice);
  const defaultMargin = settings?.defaultPartMargin ?? 30;

  const submit = () =>
    save.mutate(form, {
      onSuccess: () => {
        toast.success(part ? "Pièce modifiée" : "Pièce ajoutée");
        onClose();
      },
      onError: toast.error,
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <ModalTitle
          icon={part ? <Pencil className="size-5" /> : <PackagePlus className="size-5" />}
          title={part ? "Modifier la pièce" : "Nouvelle pièce"}
          subtitle={part ? "Mettez à jour la fiche de la pièce" : "Seule la désignation est obligatoire"}
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
        <FormSection title="Identification">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Désignation" required className="sm:col-span-2">
              <IconInput
                icon={<Package className="size-4" />}
                value={form.designation}
                autoFocus
                placeholder="Ex. : Plaquettes de frein avant"
                onChange={(e) => set("designation", e.target.value)}
              />
            </Field>
            <Field label="Référence">
              <IconInput
                icon={<Hash className="size-4" />}
                value={form.reference}
                placeholder="Ex. : A0004209204"
                className="font-mono placeholder:font-sans"
                onChange={(e) => set("reference", e.target.value)}
              />
            </Field>
            <Field label="Marque">
              <IconInput icon={<Tag className="size-4" />} value={form.brand} placeholder="Bosch, Mann, Mercedes…" onChange={(e) => set("brand", e.target.value)} />
            </Field>
            <Field label="Fournisseur" className="sm:col-span-2">
              <IconInput icon={<Truck className="size-4" />} value={form.supplier} placeholder="Nom du fournisseur" onChange={(e) => set("supplier", e.target.value)} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Prix">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prix d'achat">
              <MoneyInput
                value={form.purchasePrice}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    purchasePrice: v ?? 0,
                    salePrice:
                      !part && (!f.salePrice || f.salePrice === salePriceFromMargin(f.purchasePrice, defaultMargin)) ? salePriceFromMargin(v ?? 0, defaultMargin) : f.salePrice,
                  }))
                }
              />
            </Field>
            <Field label="Prix de vente" hint={`Rempli automatiquement avec ${defaultMargin} % de marge`}>
              <MoneyInput value={form.salePrice} onChange={(v) => set("salePrice", v ?? 0)} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-slate-700">Marge par pièce</span>
              <div
                className={cn(
                  "flex h-11 items-center justify-between gap-2 rounded-xl border px-3",
                  margin.amount < 0 ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
              >
                <span className="font-bold tabular-nums">{formatMoney(margin.amount)}</span>
                <span className="text-sm font-semibold tabular-nums">{margin.percent} %</span>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Compatibilité et notes">
          <div className="space-y-4">
            <Field label="Véhicules compatibles">
              <IconInput icon={<Car className="size-4" />} value={form.compatible} placeholder="Ex. : Mercedes Classe C, GLA" onChange={(e) => set("compatible", e.target.value)} />
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} rows={2} placeholder="Remarques, équivalences, emplacement…" onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
        </FormSection>
      </div>
    </Modal>
  );
}

function PartLabel({ p }: { p: Part }) {
  return (
    <div className="min-w-0">
      <div className="font-semibold text-slate-900">{p.designation}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        {p.reference && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-600">{p.reference}</span>}
        {p.brand && <span>{p.brand}</span>}
        {p.compatible && (
          <span className="inline-flex items-center gap-1">
            <Car className="size-3.5 text-slate-400" /> {p.compatible}
          </span>
        )}
        {p.supplier && (
          <span className="inline-flex items-center gap-1 @4xl:hidden">
            <Truck className="size-3.5 text-slate-400" /> {p.supplier}
          </span>
        )}
      </div>
    </div>
  );
}

export function PartsPage() {
  const toast = useToast();
  const { data: settings } = useSettings();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Part | null | "new">(null);
  const { data, isLoading, error } = useApi<Part[]>(`/api/parts${buildQuery({ q })}`);
  const { data: all } = useApi<Part[]>("/api/parts");
  const remove = useAction((id: number) => api(`/api/parts/${id}`, "DELETE"));

  const list = data ?? [];
  const parts = all ?? [];
  const defaultMargin = settings?.defaultPartMargin ?? 30;
  const priced = parts.filter((p) => p.purchasePrice > 0);
  const avgMargin = priced.length ? Math.round((priced.reduce((s, p) => s + unitMargin(p.salePrice, p.purchasePrice).percent, 0) / priced.length) * 10) / 10 : null;
  const lowMargin = priced.filter((p) => unitMargin(p.salePrice, p.purchasePrice).percent < defaultMargin);
  const suppliers = new Set(parts.map((p) => p.supplier.trim().toLowerCase()).filter(Boolean)).size;
  const { visible, more } = useShowMore(list);

  const actions = (p: Part) => (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" title="Modifier" aria-label="Modifier" onClick={() => setEditing(p)} icon={<Pencil className="size-4" />} />
      <ConfirmButton
        size="sm"
        variant="ghost"
        title="Supprimer"
        icon={<Trash2 className="size-4" />}
        message={`Supprimer « ${p.designation} » du catalogue ?`}
        onConfirm={() => remove.mutate(p.id, { onSuccess: () => toast.success("Pièce supprimée"), onError: toast.error })}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Pièces"
        subtitle="Catalogue des pièces, prix d'achat, prix de vente et marges"
        actions={
          <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
            Nouvelle pièce
          </Button>
        }
      />

      {parts.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile
            icon={<Package className="size-5" />}
            label="Pièces au catalogue"
            value={parts.length}
            hint={suppliers ? `${suppliers} fournisseur(s)` : "Aucun fournisseur renseigné"}
          />
          <SummaryTile
            icon={<TrendingUp className="size-5" />}
            label="Marge moyenne"
            value={avgMargin !== null ? `${avgMargin} %` : "—"}
            tone={avgMargin !== null && avgMargin < 0 ? "text-red-600" : "text-emerald-700"}
            hint={`Objectif des paramètres : ${defaultMargin} %`}
          />
          <SummaryTile
            icon={<AlertTriangle className="size-5" />}
            label="Sous l'objectif de marge"
            value={lowMargin.length}
            tone={lowMargin.length ? "text-amber-600" : "text-slate-900"}
            hint={lowMargin.length ? "Prix de vente à revoir" : "Toutes les marges atteignent l'objectif"}
          />
        </div>
      )}

      <ListPanel
        toolbar={
          <SearchField
            value={q}
            onChange={setQ}
            autoFocus
            placeholder="Référence, désignation, marque, véhicule compatible…"
            count={data && `${list.length} pièce${list.length > 1 ? "s" : ""}${q ? ` trouvée${list.length > 1 ? "s" : ""}` : ""}`}
          />
        }
      >
        {error ? (
          <div className="p-4">
            <ErrorBox error={error} />
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={<Package className="size-10 text-slate-300" />}>
            {q ? (
              <>Aucune pièce ne correspond à « {q} »</>
            ) : (
              <div className="space-y-3">
                <div>Aucune pièce au catalogue</div>
                <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
                  Ajouter une pièce
                </Button>
              </div>
            )}
          </EmptyState>
        ) : (
          <>
            {/* Faute de place, la colonne Fournisseur est masquée et le fournisseur passe sous le nom de la pièce. */}
            <div className="@container hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className={th}>Pièce</th>
                    <th className={cn(th, "hidden @4xl:table-cell")}>Fournisseur</th>
                    <th className={th}>Notes</th>
                    <th className={cn(th, "text-right")}>Prix d'achat</th>
                    <th className={cn(th, "text-right")}>Prix de vente</th>
                    <th className={cn(th, "text-right")}>Marge</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((p) => {
                    const m = unitMargin(p.salePrice, p.purchasePrice);
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50">
                        <td className={td}>
                          <div className="flex items-center gap-3">
                            <RowIcon>
                              <Package className="size-5" />
                            </RowIcon>
                            <PartLabel p={p} />
                          </div>
                        </td>
                        <td className={cn(td, "hidden text-slate-600 @4xl:table-cell")}>{p.supplier || <span className="text-slate-400">—</span>}</td>
                        <td className={cn(td, "max-w-56 text-slate-600")}>
                          {p.notes ? (
                            <span className="line-clamp-2 whitespace-pre-line" title={p.notes}>
                              {p.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={cn(td, "whitespace-nowrap text-right tabular-nums text-slate-600")}>{formatMoney(p.purchasePrice)}</td>
                        <td className={cn(td, "whitespace-nowrap text-right font-semibold tabular-nums text-slate-900")}>{formatMoney(p.salePrice)}</td>
                        <td className={cn(td, "whitespace-nowrap text-right")}>
                          <div className="flex flex-col items-end gap-0.5">
                            <MarginPill amount={m.amount} percent={m.percent} />
                            <span className={cn("text-xs tabular-nums", m.amount < 0 ? "text-red-600" : "text-slate-500")}>{formatMoney(m.amount)}</span>
                          </div>
                        </td>
                        <td className="pr-3">{actions(p)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {visible.map((p) => {
                const m = unitMargin(p.salePrice, p.purchasePrice);
                return (
                  <div key={p.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <PartLabel p={p} />
                      {p.notes && <p className="line-clamp-2 whitespace-pre-line text-sm text-slate-500">{p.notes}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-semibold tabular-nums">{formatMoney(p.salePrice)}</span>
                        <span className="tabular-nums text-slate-500">achat {formatMoney(p.purchasePrice)}</span>
                        <MarginPill amount={m.amount} percent={m.percent} />
                      </div>
                    </div>
                    {actions(p)}
                  </div>
                );
              })}
            </div>
            {more}
          </>
        )}
      </ListPanel>

      <PartFormModal open={editing !== null} onClose={() => setEditing(null)} part={editing === "new" ? null : editing} />
    </>
  );
}
