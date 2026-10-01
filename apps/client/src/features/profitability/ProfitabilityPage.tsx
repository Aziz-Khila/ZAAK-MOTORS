import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Equal, Minus, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { chargeCategoryLabel, formatMoney, type Profitability } from "@garage/shared";
import { useApi } from "../../api";
import { PeriodFilter, usePeriod } from "../../components/PeriodFilter";
import { Card, ErrorBox, PageHeader, Spinner, Tabs, cn } from "../../components/ui";

type Section = "charges" | "revenus" | "resultat";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const totalCharges = (p: Profitability) => p.partsCost + p.servicesCost + p.variableCharges + p.fixedCharges + p.depreciation;
const totalRevenues = (p: Profitability) => p.revenue + p.otherRevenues;

const tabLabel = (icon: ReactNode, text: string) => (
  <span className="inline-flex items-center gap-2">
    {icon} {text}
  </span>
);

const SECTIONS: { value: Section; label: ReactNode }[] = [
  { value: "charges", label: tabLabel(<TrendingDown className="size-4" />, "Charges") },
  { value: "revenus", label: tabLabel(<TrendingUp className="size-4" />, "Revenus") },
  { value: "resultat", label: tabLabel(<Scale className="size-4" />, "Résultat") },
];

function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn("whitespace-nowrap tabular-nums", className)}>{formatMoney(value)}</span>;
}

function TotalBanner({ label, hint, value, tone }: { label: string; hint: string; value: number; tone: "red" | "green" }) {
  return (
    <section className={cn("mb-5 rounded-2xl border p-5 shadow-sm", tone === "red" ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50")}>
      <div className={cn("font-semibold", tone === "red" ? "text-red-800" : "text-emerald-800")}>{label}</div>
      <Money value={value} className={cn("mt-1 block text-4xl font-black", tone === "red" ? "text-red-700" : "text-emerald-700")} />
      <div className="mt-1 text-sm text-slate-600">{hint}</div>
    </section>
  );
}

type Row = { key: string; label: string; hint?: string; value: number };

function AmountList({ title, rows, total, bar, empty }: { title: string; rows: Row[]; total: number; bar: string; empty: string }) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-slate-500">{empty}</div>
      ) : (
        <ul className="-my-2 divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.key} className="py-3">
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{r.label}</div>
                  {r.hint && <div className="text-xs text-slate-500">{r.hint}</div>}
                </div>
                <div className="flex shrink-0 items-baseline gap-3">
                  <span className="text-xs font-semibold text-slate-400">{pct(r.value, total)} %</span>
                  <Money value={r.value} className="font-bold text-slate-900" />
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct(r.value, total)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ChargesTab({ p }: { p: Profitability }) {
  const rows: Row[] = [
    { key: "parts", label: "Achat des pièces vendues", hint: "Prix d'achat des pièces facturées aux clients", value: p.partsCost },
    { key: "services", label: "Coût des autres prestations", hint: "Prix d'achat des prestations facturées", value: p.servicesCost },
    { key: "investments", label: "Investissements (amortissement)", hint: "Chaque mois : prix d'achat du matériel ÷ durée d'utilisation", value: p.depreciation },
    ...p.chargesByCategory.map((c) => ({
      key: `${c.kind}-${c.category}`,
      label: chargeCategoryLabel(c.category),
      hint: c.kind === "fixe" ? "Charge fixe" : "Charge variable",
      value: c.amount,
    })),
  ]
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = totalCharges(p);
  return (
    <>
      <TotalBanner label="Total des charges" hint="Tout ce que le garage a dépensé sur la période" value={total} tone="red" />
      <AmountList title="Détail des charges" rows={rows} total={total} bar="bg-red-400" empty="Aucune charge sur la période" />
    </>
  );
}

function RevenuesTab({ p }: { p: Profitability }) {
  const rows: Row[] = [
    { key: "labor", label: "Main-d'œuvre", hint: "Facturée aux clients, hors taxes", value: p.laborRevenue },
    { key: "parts", label: "Pièces vendues", hint: "Facturées aux clients, hors taxes", value: p.partsRevenue },
    { key: "services", label: "Autres prestations", hint: "Facturées aux clients, hors taxes", value: p.servicesRevenue },
    { key: "other", label: "Autres revenus", hint: "Ferraille, location… (hors factures)", value: p.otherRevenues },
  ];
  const total = totalRevenues(p);
  return (
    <>
      <TotalBanner label="Total des revenus" hint={`${p.invoiceCount} facture(s) validée(s) et autres revenus de la période`} value={total} tone="green" />
      <AmountList title="Détail des revenus" rows={rows} total={total} bar="bg-emerald-500" empty="Aucun revenu sur la période" />
    </>
  );
}

function Operand({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <Money value={value} className={cn("mt-1 block text-2xl font-bold", tone)} />
    </div>
  );
}

function Operator({ children }: { children: ReactNode }) {
  return <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-slate-200 text-slate-600">{children}</span>;
}

function ResultTab({ p }: { p: Profitability }) {
  const positive = p.result >= 0;
  const months = p.monthly.filter((m) => m.revenue !== 0 || m.charges !== 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1.3fr]">
        <Operand label="Revenus" value={totalRevenues(p)} tone="text-emerald-700" />
        <Operator>
          <Minus className="size-5" />
        </Operator>
        <Operand label="Charges" value={totalCharges(p)} tone="text-red-600" />
        <Operator>
          <Equal className="size-5" />
        </Operator>
        <div className={cn("rounded-2xl border p-5 text-center shadow-sm", positive ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50")}>
          <div className={cn("text-sm font-bold", positive ? "text-emerald-800" : "text-red-800")}>{positive ? "Bénéfice" : "Perte"}</div>
          <Money value={p.result} className={cn("mt-1 block text-3xl font-black", positive ? "text-emerald-700" : "text-red-700")} />
        </div>
      </div>

      <p className={cn("rounded-xl px-4 py-3 text-center font-medium", positive ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900")}>
        {positive
          ? `Sur cette période, le garage a gagné ${formatMoney(p.result)} de plus qu'il n'a dépensé.`
          : `Sur cette période, le garage a dépensé ${formatMoney(-p.result)} de plus qu'il n'a gagné.`}
      </p>

      {months.length > 0 && (
        <Card title="Mois par mois">
          <div className="-m-4 overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 text-left">Mois</th>
                  <th className="px-4 py-2.5 text-right">Revenus</th>
                  <th className="px-4 py-2.5 text-right">Charges</th>
                  <th className="px-4 py-2.5 text-right">Résultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.map((m) => (
                  <tr key={m.month}>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {MONTHS[Number(m.month.slice(5, 7)) - 1]} {m.month.slice(0, 4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money value={m.revenue} className="text-emerald-700" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money value={m.charges} className="text-red-600" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money value={m.result} className={cn("font-bold", m.result >= 0 ? "text-emerald-700" : "text-red-700")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function ProfitabilityPage() {
  const { query } = usePeriod();
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.find((s) => s.value === params.get("onglet"))?.value ?? "resultat";
  const { data: p, isLoading, error } = useApi<Profitability>(`/api/profitability?${query}`);

  const selectSection = (v: Section) => {
    const next = new URLSearchParams(params);
    next.set("onglet", v);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Rentabilité" subtitle="Ce que le garage dépense, ce qu'il gagne, et ce qu'il lui reste" />
      <PeriodFilter />
      <Tabs value={section} onChange={selectSection} tabs={SECTIONS} />

      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !p ? (
        <Spinner />
      ) : section === "charges" ? (
        <ChargesTab p={p} />
      ) : section === "revenus" ? (
        <RevenuesTab p={p} />
      ) : (
        <ResultTab p={p} />
      )}
    </>
  );
}
