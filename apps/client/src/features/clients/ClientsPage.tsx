import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronRight, Phone, Plus, Search, UserRound, Users, Wallet } from "lucide-react";
import { formatMoney, type ClientListItem } from "@garage/shared";
import { useApi } from "../../api";
import { ClientFormModal } from "../../components/forms";
import { useShowMore } from "../../components/list";
import { PlateBadge } from "../../components/StatusBadge";
import { SummaryTile } from "../../components/tiles";
import { Button, EmptyState, ErrorBox, PageHeader, Spinner, cn } from "../../components/ui";
import { ClientAvatar, ClientTypeTag } from "./ClientAvatar";

function Plates({ plates }: { plates: string }) {
  const list = plates.split(", ").filter(Boolean);
  if (list.length === 0) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.slice(0, 2).map((p) => (
        <PlateBadge key={p} plate={p} />
      ))}
      {list.length > 2 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">+{list.length - 2}</span>}
    </div>
  );
}

const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-5";
const td = "px-4 py-3.5 first:pl-5";

export function ClientsPage() {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, error } = useApi<ClientListItem[]>(`/api/clients?q=${encodeURIComponent(q)}`);

  const list = data ?? [];
  const companies = list.filter((c) => c.type === "societe").length;
  const withDebt = list.filter((c) => c.balance > 0);
  const totalDue = withDebt.reduce((s, c) => s + c.balance, 0);
  const { visible, more } = useShowMore(list);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Fichier clients, coordonnées et véhicules"
        actions={
          <Button icon={<Plus className="size-5" />} onClick={() => setCreating(true)}>
            Nouveau client
          </Button>
        }
      />

      {data && !q && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile icon={<Users className="size-5" />} label="Clients" value={list.length} hint={`${list.length - companies} particulier(s) · ${companies} société(s)`} />
          <SummaryTile
            icon={<UserRound className="size-5" />}
            label="Clients avec un solde dû"
            value={withDebt.length}
            tone={withDebt.length > 0 ? "text-red-600" : "text-emerald-700"}
            hint={withDebt.length > 0 ? "À relancer" : "Tout le monde est à jour"}
          />
          <SummaryTile icon={<Wallet className="size-5" />} label="Total à encaisser" value={formatMoney(totalDue)} tone={totalDue > 0 ? "text-red-600" : "text-emerald-700"} />
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par nom, téléphone ou immatriculation…"
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {data && (
            <span className="px-2 text-sm text-slate-500">
              {list.length} client{list.length > 1 ? "s" : ""}
              {q ? ` trouvé${list.length > 1 ? "s" : ""}` : ""}
            </span>
          )}
        </div>

        {error ? (
          <div className="p-4">
            <ErrorBox error={error} />
          </div>
        ) : isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={<Users className="size-10 text-slate-300" />}>{q ? `Aucun client ne correspond à « ${q} »` : "Aucun client pour le moment"}</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className={th}>Client</th>
                  <th className={th}>Téléphone</th>
                  <th className={cn(th, "hidden md:table-cell")}>Véhicules</th>
                  <th className={cn(th, "text-right")}>Solde</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <ClientAvatar name={c.name} type={c.type} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700">{c.name}</span>
                            {c.type === "societe" && <ClientTypeTag type={c.type} />}
                          </div>
                          <div className="max-w-xs truncate text-xs text-slate-500">{c.address || c.email || (c.type === "societe" ? "Société" : "Particulier")}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      {c.phone ? (
                        <div className="flex items-center gap-2 tabular-nums text-slate-700">
                          <Phone className="size-3.5 text-slate-400" />
                          {c.phone}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                      {c.phone2 && <div className="pl-5.5 text-xs tabular-nums text-slate-400">{c.phone2}</div>}
                    </td>
                    <td className={cn(td, "hidden md:table-cell")}>
                      <Plates plates={c.plates} />
                    </td>
                    <td className={cn(td, "text-right")}>
                      {c.balance > 0 ? (
                        <div>
                          <div className="font-bold tabular-nums text-red-600">{formatMoney(c.balance)}</div>
                          <div className="text-xs text-slate-400">à payer</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Check className="size-3.5" /> À jour
                        </span>
                      )}
                    </td>
                    <td className="pr-4">
                      <ChevronRight className="size-5 text-slate-300 transition-colors group-hover:text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {more}
          </div>
        )}
      </section>

      <ClientFormModal open={creating} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/clients/${c.id}`)} />
    </>
  );
}
