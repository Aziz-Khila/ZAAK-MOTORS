import { useState } from "react";
import { AlertCircle, FilePen, Plus, Receipt, Wallet } from "lucide-react";
import { BILLED_INVOICE_STATUSES, formatMoney, type InvoiceListItem, type InvoiceStatus } from "@garage/shared";
import { buildQuery, useApi } from "../../api";
import { FilterPills, ListPanel, SearchField } from "../../components/list";
import { SummaryTile } from "../../components/tiles";
import { DOT_COLORS, ErrorBox, LinkButton, PageHeader, Spinner } from "../../components/ui";
import { InvoicesTable } from "../history";

type Filter = "" | "unpaid" | "brouillon" | "payee" | "annulee";

export function InvoicesPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const params = filter === "unpaid" ? { q, unpaid: true } : { q, status: filter };
  const { data, isLoading, error } = useApi<InvoiceListItem[]>(`/api/invoices${buildQuery(params)}`);
  const { data: all } = useApi<InvoiceListItem[]>("/api/invoices");

  const rows = data ?? [];
  const list = filter === "unpaid" ? [...rows].sort((a, b) => Number(b.status === "impayee") - Number(a.status === "impayee")) : rows;
  const remaining = list.reduce((s, f) => s + f.remaining, 0);
  const invoices = all ?? [];
  const billed = invoices.filter((f) => BILLED_INVOICE_STATUSES.includes(f.status as InvoiceStatus));
  const billedTotal = billed.reduce((s, f) => s + f.total, 0);
  const collected = billed.reduce((s, f) => s + f.paid, 0);
  const toCollect = billed.filter((f) => f.remaining > 0);
  const toCollectTotal = toCollect.reduce((s, f) => s + f.remaining, 0);
  const late = invoices.filter((f) => f.status === "impayee");
  const drafts = invoices.filter((f) => f.status === "brouillon");
  const count = (s: string) => invoices.filter((f) => f.status === s).length;

  return (
    <>
      <PageHeader
        title="Factures"
        subtitle="Facturation, paiements reçus et montants à encaisser"
        actions={
          <LinkButton to="/factures/nouvelle" icon={<Plus className="size-5" />}>
            Nouvelle facture
          </LinkButton>
        }
      />

      {invoices.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={<Receipt className="size-5" />} label="Total facturé" value={formatMoney(billedTotal)} hint={`${billed.length} facture(s) validée(s)`} />
          <SummaryTile
            icon={<Wallet className="size-5" />}
            label="Encaissé"
            value={formatMoney(collected)}
            tone="text-emerald-700"
            hint={billedTotal ? `${Math.round((collected / billedTotal) * 100)} % du montant facturé` : undefined}
          />
          <SummaryTile
            icon={<AlertCircle className="size-5" />}
            label="Reste à encaisser"
            value={formatMoney(toCollectTotal)}
            tone={toCollectTotal ? "text-red-600" : "text-emerald-700"}
            hint={toCollect.length ? `${toCollect.length} facture(s) · dont ${late.length} en retard` : "Tout est encaissé"}
          />
          <SummaryTile
            icon={<FilePen className="size-5" />}
            label="Brouillons"
            value={drafts.length}
            tone={drafts.length ? "text-amber-600" : "text-slate-900"}
            hint={drafts.length ? "À vérifier puis valider" : "Aucun brouillon"}
          />
        </div>
      )}

      <ListPanel
        toolbar={
          <>
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="N° de facture, client, immatriculation…"
              count={data && `${list.length} facture${list.length > 1 ? "s" : ""}${remaining ? ` · ${formatMoney(remaining)} à encaisser` : ""}`}
            />
            <FilterPills
              value={filter}
              onChange={setFilter}
              options={[
                { value: "", label: "Toutes", count: all?.length },
                { value: "unpaid", label: "À encaisser", count: all ? toCollect.length : undefined, dot: DOT_COLORS.amber },
                { value: "brouillon", label: "Brouillons", count: all ? drafts.length : undefined, dot: DOT_COLORS.slate },
                { value: "payee", label: "Payées", count: all ? count("payee") : undefined, dot: DOT_COLORS.green },
                { value: "annulee", label: "Annulées", count: all ? count("annulee") : undefined, dot: DOT_COLORS.gray },
              ]}
            />
          </>
        }
      >
        {error ? (
          <div className="p-4">
            <ErrorBox error={error} />
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : (
          <InvoicesTable rows={list} />
        )}
      </ListPanel>
    </>
  );
}
