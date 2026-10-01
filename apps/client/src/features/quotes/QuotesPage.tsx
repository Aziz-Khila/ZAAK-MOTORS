import { useState } from "react";
import { CheckCircle2, Clock, FileText, Percent, Plus } from "lucide-react";
import { QUOTE_STATUSES, formatMoney, type QuoteListItem } from "@garage/shared";
import { buildQuery, useApi } from "../../api";
import { FilterPills, ListPanel, SearchField } from "../../components/list";
import { SummaryTile } from "../../components/tiles";
import { DOT_COLORS, ErrorBox, LinkButton, PageHeader, Spinner } from "../../components/ui";
import { QuotesTable } from "../history";

export function QuotesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const { data, isLoading, error } = useApi<QuoteListItem[]>(`/api/quotes${buildQuery({ q, status })}`);
  const { data: all } = useApi<QuoteListItem[]>("/api/quotes");

  const list = data ?? [];
  const total = list.reduce((s, d) => s + d.total, 0);
  const quotes = all ?? [];
  const byStatus = (s: string) => quotes.filter((d) => d.status === s);
  const pending = byStatus("en_attente");
  const accepted = byStatus("accepte");
  const refused = byStatus("refuse");
  const decided = accepted.length + refused.length;
  const sum = (rows: QuoteListItem[]) => rows.reduce((s, d) => s + d.total, 0);

  return (
    <>
      <PageHeader
        title="Devis"
        subtitle="Propositions de prix envoyées aux clients et leur suivi"
        actions={
          <LinkButton to="/devis/nouveau" icon={<Plus className="size-5" />}>
            Nouveau devis
          </LinkButton>
        }
      />

      {quotes.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={<FileText className="size-5" />} label="Devis" value={quotes.length} hint={`${formatMoney(sum(quotes))} au total`} />
          <SummaryTile
            icon={<Clock className="size-5" />}
            label="En attente de réponse"
            value={pending.length}
            tone={pending.length ? "text-amber-600" : "text-slate-900"}
            hint={pending.length ? formatMoney(sum(pending)) : "Aucun devis en attente"}
          />
          <SummaryTile
            icon={<CheckCircle2 className="size-5" />}
            label="Acceptés"
            value={accepted.length}
            tone={accepted.length ? "text-emerald-700" : "text-slate-900"}
            hint={`${accepted.filter((d) => d.invoiceId).length} transformé(s) en facture`}
          />
          <SummaryTile
            icon={<Percent className="size-5" />}
            label="Taux d'acceptation"
            value={decided ? `${Math.round((accepted.length / decided) * 100)} %` : "—"}
            hint={decided ? `${refused.length} refusé(s)` : "Aucun devis tranché"}
          />
        </div>
      )}

      <ListPanel
        toolbar={
          <>
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="N° de devis, client, immatriculation…"
              count={data && `${list.length} devis · ${formatMoney(total)}`}
            />
            <FilterPills
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "Tous", count: all?.length },
                ...QUOTE_STATUSES.map((s) => ({ value: s.value, label: s.label, count: all ? byStatus(s.value).length : undefined, dot: DOT_COLORS[s.color] })),
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
          <QuotesTable rows={list} />
        )}
      </ListPanel>
    </>
  );
}
