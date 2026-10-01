import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Landmark, TrendingUp, Wallet } from "lucide-react";
import { PageHeader, Tabs } from "../../components/ui";
import { ChargesSection } from "./ChargesSection";
import { InvestmentsSection } from "./InvestmentsSection";
import { RevenuesSection } from "./RevenuesSection";

type Section = "charges" | "revenus" | "investissements";

const tabLabel = (icon: ReactNode, text: string) => (
  <span className="inline-flex items-center gap-2">
    {icon} {text}
  </span>
);

const SECTIONS: { value: Section; label: ReactNode }[] = [
  { value: "charges", label: tabLabel(<Wallet className="size-4" />, "Charges") },
  { value: "revenus", label: tabLabel(<TrendingUp className="size-4" />, "Revenus") },
  { value: "investissements", label: tabLabel(<Landmark className="size-4" />, "Investissements") },
];

export function AccountingPage() {
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.find((s) => s.value === params.get("onglet"))?.value ?? "charges";

  const header = (actions: ReactNode) => (
    <>
      <PageHeader title="Comptabilité" subtitle="Charges courantes, recettes hors factures et investissements en matériel" actions={actions} />
      <Tabs value={section} onChange={(v) => setParams(v === "charges" ? {} : { onglet: v }, { replace: true })} tabs={SECTIONS} />
    </>
  );

  if (section === "revenus") return <RevenuesSection header={header} />;
  if (section === "investissements") return <InvestmentsSection header={header} />;
  return <ChargesSection header={header} />;
}
