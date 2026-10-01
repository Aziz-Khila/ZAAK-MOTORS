import { useState, type ReactNode } from "react";
import { ClipboardPlus, Eye, EyeOff, Package, Sparkles, Trash2, Wrench } from "lucide-react";
import { computeTotals, formatMoney, formatQuantity, lineTotal, lineTypeLabel, unitMargin, type Line, type LineType, type Part, type ServiceTemplate } from "@garage/shared";
import { useApi, useSettings } from "../api";
import { DecimalInput, MoneyInput } from "./inputs";
import { Badge, Button, Input, Modal, cn } from "./ui";

const TYPE_COLORS: Record<LineType, string> = { main_oeuvre: "blue", piece: "green", prestation: "violet" };
const COST_KEY = "lines.showCost";

/** Largeur du bloc à partir de laquelle le tableau tient sans défilement (sinon : une carte par ligne). */
const TABLE_FROM = { narrow: "@lg:block", wide: "@3xl:block", xwide: "@5xl:block" } as const;
const CARDS_UNTIL = { narrow: "@lg:hidden", wide: "@3xl:hidden", xwide: "@5xl:hidden" } as const;

function newLine(type: LineType, hourlyRate: number): Line {
  return {
    type,
    designation: "",
    reference: "",
    partId: null,
    quantity: 1,
    unitPrice: type === "main_oeuvre" ? hourlyRate : 0,
    unitCost: 0,
  };
}

function PartPickerModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Part | null) => void }) {
  const [q, setQ] = useState("");
  const { data: parts } = useApi<Part[]>(open ? `/api/parts?q=${encodeURIComponent(q)}` : null);
  return (
    <Modal open={open} onClose={onClose} title="Ajouter une pièce" size="lg">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : référence, désignation, marque, véhicule…" />
          <Button variant="secondary" onClick={() => onPick(null)}>
            Pièce hors catalogue
          </Button>
        </div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {parts?.length === 0 && <div className="p-4 text-center text-slate-500">Aucune pièce trouvée</div>}
          {parts?.slice(0, 50).map((p) => (
            <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50">
              <div className="min-w-0">
                <div className="font-semibold">{p.designation}</div>
                <div className="text-sm text-slate-500">{[p.reference, p.brand, p.compatible].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="shrink-0 text-right font-bold tabular-nums">{formatMoney(p.salePrice)}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TemplatePickerModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (t: ServiceTemplate) => void }) {
  const { data: templates } = useApi<ServiceTemplate[]>(open ? "/api/templates" : null);
  return (
    <Modal open={open} onClose={onClose} title="Prestations fréquentes" size="lg">
      <div className="grid gap-3 sm:grid-cols-2">
        {templates?.map((t) => {
          const total = t.lines.reduce((s, l) => s + lineTotal(l), 0);
          return (
            <button key={t.id} onClick={() => onPick(t)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50">
              <div className="flex items-start justify-between gap-2">
                <div className="text-lg font-bold">{t.name}</div>
                <div className="font-bold tabular-nums text-blue-700">{formatMoney(total)}</div>
              </div>
              <div className="mt-1 text-sm text-slate-500">{t.lines.map((l) => l.designation).join(" · ")}</div>
            </button>
          );
        })}
        {templates?.length === 0 && <div className="text-slate-500">Aucune prestation enregistrée (voir Paramètres).</div>}
      </div>
    </Modal>
  );
}

/**
 * Éditeur de lignes (main-d'œuvre, pièces, prestations) partagé par les devis, factures
 * et prestations fréquentes. Les totaux sont recalculés en direct.
 */
export function LinesEditor({
  lines,
  onChange,
  readOnly,
  showCost = true,
  showTotals = true,
  allowTemplates = true,
}: {
  lines: Line[];
  onChange: (lines: Line[]) => void;
  readOnly?: boolean;
  showCost?: boolean;
  showTotals?: boolean;
  allowTemplates?: boolean;
}) {
  const { data: settings } = useSettings();
  const hourlyRate = settings?.hourlyRate ?? 0;
  const [partPicker, setPartPicker] = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [costVisible, setCostVisible] = useState(() => localStorage.getItem(COST_KEY) === "1");
  const toggleCost = () => {
    localStorage.setItem(COST_KEY, costVisible ? "0" : "1");
    setCostVisible(!costVisible);
  };
  const withCost = showCost && costVisible;

  const update = (idx: number, patch: Partial<Line>) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const remove = (idx: number) => onChange(lines.filter((_, i) => i !== idx));
  const add = (line: Line) => onChange([...lines, line]);

  const totals = computeTotals(lines, {
    vatEnabled: settings?.vatEnabled ?? false,
    vatRate: settings?.vatRate ?? 0,
    stampEnabled: settings?.stampEnabled ?? false,
    stampAmount: settings?.stampAmount ?? 0,
  });
  const hours = lines.filter((l) => l.type === "main_oeuvre").reduce((s, l) => s + (l.quantity || 0), 0);
  const layout = !readOnly && withCost ? "xwide" : !readOnly || withCost ? "wide" : "narrow";

  /** Contenu de chaque champ d'une ligne, partagé par le tableau et l'affichage en cartes. */
  const fields = (line: Line, idx: number) => {
    const margin = unitMargin(line.unitPrice, line.unitCost);
    return {
      badge: (
        <Badge color={TYPE_COLORS[line.type]} className="shrink-0 text-xs">
          {lineTypeLabel(line.type)}
        </Badge>
      ),
      designation: (
        <Input
          value={line.designation}
          placeholder={line.type === "main_oeuvre" ? "Ex. : Remplacement plaquettes" : "Désignation"}
          onChange={(e) => update(idx, { designation: e.target.value })}
        />
      ),
      reference:
        readOnly || line.type === "main_oeuvre" ? (
          <span className="break-words text-slate-500">{line.reference || "—"}</span>
        ) : (
          <Input value={line.reference} onChange={(e) => update(idx, { reference: e.target.value })} />
        ),
      quantity: readOnly ? (
        <span className="tabular-nums">
          {formatQuantity(line.quantity)}
          {line.type === "main_oeuvre" ? " h" : ""}
        </span>
      ) : (
        <DecimalInput value={line.quantity} suffix={line.type === "main_oeuvre" ? "h" : undefined} onChange={(v) => update(idx, { quantity: v ?? 0 })} />
      ),
      unitPrice: readOnly ? (
        <span className="tabular-nums">{formatMoney(line.unitPrice, false)}</span>
      ) : (
        <MoneyInput value={line.unitPrice} onChange={(v) => update(idx, { unitPrice: v ?? 0 })} />
      ),
      cost:
        line.type === "main_oeuvre" ? (
          <span className="text-slate-300">—</span>
        ) : readOnly ? (
          <span className="tabular-nums text-slate-500">{formatMoney(line.unitCost, false)}</span>
        ) : (
          <MoneyInput value={line.unitCost} onChange={(v) => update(idx, { unitCost: v ?? 0 })} />
        ),
      margin:
        line.type === "main_oeuvre" || !line.unitCost ? (
          <span className="text-slate-300">—</span>
        ) : (
          <span className={margin.amount < 0 ? "font-semibold text-red-600" : "text-emerald-700"}>
            {formatMoney(Math.round(margin.amount * line.quantity), false)}
            <br />
            {margin.percent} %
          </span>
        ),
      total: formatMoney(lineTotal(line), false),
      remove: (
        <button onClick={() => remove(idx)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer la ligne">
          <Trash2 className="size-5" />
        </button>
      ),
    };
  };

  return (
    <div className="space-y-3">
      {(!readOnly || (showCost && lines.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              {allowTemplates && (
                <Button variant="primary" icon={<Sparkles className="size-5" />} onClick={() => setTemplatePicker(true)}>
                  Prestation fréquente
                </Button>
              )}
              <Button variant="secondary" icon={<Wrench className="size-5 text-blue-600" />} onClick={() => add(newLine("main_oeuvre", hourlyRate))}>
                Main-d'œuvre
              </Button>
              <Button variant="secondary" icon={<Package className="size-5 text-emerald-600" />} onClick={() => setPartPicker(true)}>
                Pièce
              </Button>
              <Button variant="secondary" icon={<ClipboardPlus className="size-5 text-violet-600" />} onClick={() => add(newLine("prestation", hourlyRate))}>
                Autre prestation
              </Button>
            </>
          )}
          {showCost && lines.length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto" icon={costVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />} onClick={toggleCost}>
              {costVisible ? "Masquer prix d'achat et marge" : "Voir prix d'achat et marge"}
            </Button>
          )}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-slate-500">
          {readOnly ? "Aucune ligne" : "Ajoutez une prestation fréquente, de la main-d'œuvre ou des pièces."}
        </div>
      ) : (
        // La largeur disponible dépend de l'écran et du menu : tableau si la place suffit, sinon une carte par ligne.
        <div className="@container">
          <div className={cn("hidden overflow-hidden rounded-xl border border-slate-200", TABLE_FROM[layout])}>
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Désignation</th>
                  {!readOnly && <th className="w-28 px-2 py-2 text-left">Réf.</th>}
                  <th className={cn("px-2 py-2 text-right", readOnly ? "w-20" : "w-24")}>Qté / h</th>
                  <th className={cn("px-2 py-2 text-right", readOnly ? "w-28" : "w-36")}>Prix unit.</th>
                  {withCost && <th className={cn("px-2 py-2 text-right", readOnly ? "w-28" : "w-36")}>Prix d'achat</th>}
                  {withCost && <th className="w-24 px-2 py-2 text-right">Marge</th>}
                  <th className="w-28 px-2 py-2 text-right">Total</th>
                  {!readOnly && <th className="w-11" />}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const f = fields(line, idx);
                  return (
                    <tr key={idx} className="border-t border-slate-100 align-middle">
                      <td className="px-2 py-1.5">
                        {readOnly ? (
                          <div className="space-y-1">
                            {f.badge}
                            <div className="break-words font-medium">{line.designation}</div>
                            {line.reference && <div className="break-words text-xs text-slate-500">{line.reference}</div>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {f.badge}
                            <div className="min-w-0 flex-1">{f.designation}</div>
                          </div>
                        )}
                      </td>
                      {!readOnly && <td className="px-2 py-1.5">{f.reference}</td>}
                      <td className="px-2 py-1.5 text-right">{f.quantity}</td>
                      <td className="px-2 py-1.5 text-right">{f.unitPrice}</td>
                      {withCost && <td className="px-2 py-1.5 text-right">{f.cost}</td>}
                      {withCost && <td className="px-2 py-1.5 text-right text-xs tabular-nums">{f.margin}</td>}
                      <td className="px-2 py-1.5 text-right font-bold tabular-nums">{f.total}</td>
                      {!readOnly && <td className="px-1 py-1.5">{f.remove}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={cn("divide-y divide-slate-100 rounded-xl border border-slate-200", CARDS_UNTIL[layout])}>
            {lines.map((line, idx) => {
              const f = fields(line, idx);
              const cell = (label: string, content: ReactNode) => (
                <div className="min-w-0">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                  {content}
                </div>
              );
              return (
                <div key={idx} className="space-y-3 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {f.badge}
                      {readOnly ? <div className="break-words font-medium">{line.designation}</div> : f.designation}
                    </div>
                    {!readOnly && f.remove}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm @md:grid-cols-4">
                    {(!readOnly || line.reference) && cell("Réf.", f.reference)}
                    {cell("Qté / h", f.quantity)}
                    {cell("Prix unit.", f.unitPrice)}
                    {withCost && line.type !== "main_oeuvre" && cell("Prix d'achat", f.cost)}
                    {withCost && line.type !== "main_oeuvre" && line.unitCost > 0 && cell("Marge", <span className="text-xs tabular-nums">{f.margin}</span>)}
                    {cell("Total", <span className="font-bold tabular-nums">{f.total}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTotals && lines.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-sm text-slate-500">
            {hours > 0 && (
              <>
                Temps de main-d'œuvre : <strong>{formatQuantity(hours)} h</strong>.{" "}
              </>
            )}
            {withCost && totals.cost > 0 && (
              <>
                Marge estimée : <strong className="text-emerald-700">{formatMoney(totals.margin)}</strong>
              </>
            )}
          </div>
          <TotalsBox
            labor={totals.labor}
            parts={totals.parts}
            services={totals.services}
            subtotal={totals.subtotal}
            vat={totals.vat}
            vatRate={totals.vatRate}
            stamp={totals.stamp}
            total={totals.total}
            vatEnabled={settings?.vatEnabled ?? false}
          />
        </div>
      )}

      <PartPickerModal
        open={partPicker}
        onClose={() => setPartPicker(false)}
        onPick={(p) => {
          setPartPicker(false);
          add(
            p
              ? {
                  type: "piece",
                  designation: p.designation,
                  reference: p.reference,
                  partId: p.id,
                  quantity: 1,
                  unitPrice: p.salePrice,
                  unitCost: p.purchasePrice,
                }
              : newLine("piece", hourlyRate),
          );
        }}
      />
      <TemplatePickerModal
        open={templatePicker}
        onClose={() => setTemplatePicker(false)}
        onPick={(t) => {
          setTemplatePicker(false);
          onChange([...lines, ...t.lines.map(({ id: _id, total: _t, ...l }) => l)]);
        }}
      />
    </div>
  );
}

export function TotalsBox({
  labor,
  parts,
  services,
  subtotal,
  vat,
  vatRate,
  stamp,
  total,
  vatEnabled,
  paid,
  plain,
}: {
  labor?: number;
  parts?: number;
  services?: number;
  subtotal: number;
  vat: number;
  vatRate: number;
  stamp: number;
  total: number;
  vatEnabled: boolean;
  paid?: number;
  /** Sans fond ni largeur fixe, pour un affichage dans une carte. */
  plain?: boolean;
}) {
  const row = (label: string, value: number, strong = false) => (
    <div className={cn("flex justify-between gap-6", strong && "text-lg font-bold")}>
      <span className={strong ? "" : "text-slate-600"}>{label}</span>
      <span className="tabular-nums">{formatMoney(value)}</span>
    </div>
  );
  const showVat = vatEnabled || vat > 0;
  return (
    <div className={cn("w-full space-y-1", plain ? "" : "rounded-xl bg-slate-50 p-4 sm:w-80")}>
      {labor !== undefined && labor > 0 && row("Main-d'œuvre", labor)}
      {parts !== undefined && parts > 0 && row("Pièces", parts)}
      {services !== undefined && services > 0 && row("Autres prestations", services)}
      {showVat && row("Total HT", subtotal)}
      {showVat && row(`TVA ${vatRate} %`, vat)}
      {stamp > 0 && row("Timbre fiscal", stamp)}
      <div className="border-t border-slate-200 pt-1">{row(showVat ? "Total TTC" : "Total", total, true)}</div>
      {paid !== undefined && (
        <>
          {row("Déjà payé", paid)}
          <div className={cn("flex justify-between gap-6 text-lg font-bold", total - paid > 0 ? "text-red-600" : "text-emerald-700")}>
            <span>Reste à payer</span>
            <span className="tabular-nums">{formatMoney(total - paid)}</span>
          </div>
        </>
      )}
    </div>
  );
}
