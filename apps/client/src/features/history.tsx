import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, ChevronRight, FileText, Receipt } from "lucide-react";
import { formatDate, formatMoney, today, type InvoiceListItem, type QuoteListItem } from "@garage/shared";
import { listTd as td, listTh as th, RowChevron, RowIcon, useShowMore } from "../components/list";
import { InvoiceStatusBadge, PlateBadge, QuoteStatusBadge } from "../components/StatusBadge";
import { EmptyState, cn } from "../components/ui";
import { ClientAvatar } from "./clients/ClientAvatar";

/** Tableaux de liste réutilisés par les pages Devis / Factures et les fiches client et véhicule. */

function ListTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="@container hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/70">
          <tr>
            {head}
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function MobileList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-slate-100 md:hidden">{children}</div>;
}

function MobileRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left transition active:bg-slate-50">
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
      <ChevronRight className="size-5 shrink-0 text-slate-300" />
    </button>
  );
}

function ClientCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <ClientAvatar name={name} type="particulier" size="sm" />
      <span className="font-medium text-slate-800">{name}</span>
    </div>
  );
}

const rowClass = "group cursor-pointer transition-colors hover:bg-slate-50";

/** Faute de place, la colonne Véhicule est masquée et la plaque passe sous le numéro du document. */
const vehicleCol = "hidden @3xl:table-cell";

function PlateUnderNumber({ plate }: { plate: string }) {
  if (!plate) return null;
  return (
    <div className="mt-1 @3xl:hidden">
      <PlateBadge plate={plate} />
    </div>
  );
}

export function QuotesTable({ rows: allRows, showClient = true }: { rows: QuoteListItem[]; showClient?: boolean }) {
  const navigate = useNavigate();
  const { visible: rows, more } = useShowMore(allRows);
  if (rows.length === 0) return <EmptyState icon={<FileText className="size-10 text-slate-300" />}>Aucun devis</EmptyState>;
  const open = (q: QuoteListItem) => navigate(`/devis/${q.id}`);
  const invoiced = (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="size-3.5" /> Facturé
    </span>
  );
  return (
    <>
      <ListTable
        head={
          <>
            <th className={th}>Devis</th>
            {showClient && <th className={th}>Client</th>}
            <th className={cn(th, vehicleCol)}>Véhicule</th>
            <th className={cn(th, "text-right")}>Montant</th>
            <th className={th}>Statut</th>
          </>
        }
      >
        {rows.map((q) => (
          <tr key={q.id} onClick={() => open(q)} className={rowClass}>
            <td className={td}>
              <div className="flex items-center gap-3">
                <RowIcon>
                  <FileText className="size-5" />
                </RowIcon>
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-blue-700">{q.number}</div>
                  <div className="text-xs text-slate-500">{formatDate(q.date)}</div>
                  <PlateUnderNumber plate={q.plate} />
                </div>
              </div>
            </td>
            {showClient && (
              <td className={td}>
                <ClientCell name={q.clientName} />
              </td>
            )}
            <td className={cn(td, vehicleCol)}>{q.plate ? <PlateBadge plate={q.plate} /> : <span className="text-slate-400">—</span>}</td>
            <td className={cn(td, "whitespace-nowrap text-right font-semibold tabular-nums text-slate-900")}>{formatMoney(q.total)}</td>
            <td className={td}>
              <div className="flex flex-wrap items-center gap-2">
                <QuoteStatusBadge status={q.status} />
                {q.invoiceId && invoiced}
              </div>
            </td>
            <td className="pr-4">
              <RowChevron />
            </td>
          </tr>
        ))}
      </ListTable>
      <MobileList>
        {rows.map((q) => (
          <MobileRow key={q.id} onClick={() => open(q)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{q.number}</span>
              <span className="font-semibold tabular-nums">{formatMoney(q.total)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <QuoteStatusBadge status={q.status} />
              {q.invoiceId && invoiced}
              <span>{formatDate(q.date)}</span>
              {showClient && <span>{q.clientName}</span>}
            </div>
          </MobileRow>
        ))}
      </MobileList>
      {more}
    </>
  );
}

function Remaining({ f }: { f: InvoiceListItem }) {
  if (f.remaining > 0) return <span className="font-bold text-red-600">{formatMoney(f.remaining)}</span>;
  if (f.status === "payee")
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="size-4" /> Réglée
      </span>
    );
  return <span className="text-slate-400">—</span>;
}

export function InvoicesTable({ rows: allRows, showClient = true }: { rows: InvoiceListItem[]; showClient?: boolean }) {
  const navigate = useNavigate();
  const { visible: rows, more } = useShowMore(allRows);
  if (rows.length === 0) return <EmptyState icon={<Receipt className="size-10 text-slate-300" />}>Aucune facture</EmptyState>;
  const open = (f: InvoiceListItem) => navigate(`/factures/${f.id}`);
  const now = today();
  const number = (f: InvoiceListItem) => f.number ?? <span className="italic text-slate-400">Brouillon</span>;
  return (
    <>
      <ListTable
        head={
          <>
            <th className={th}>Facture</th>
            {showClient && <th className={th}>Client</th>}
            <th className={cn(th, vehicleCol)}>Véhicule</th>
            <th className={cn(th, "text-right")}>Montant</th>
            <th className={cn(th, "text-right")}>Reste dû</th>
            <th className={th}>Statut</th>
          </>
        }
      >
        {rows.map((f) => {
          const overdue = f.remaining > 0 && !!f.dueDate && f.dueDate < now;
          return (
            <tr key={f.id} onClick={() => open(f)} className={rowClass}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <RowIcon>
                    <Receipt className="size-5" />
                  </RowIcon>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-700">{number(f)}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(f.date)}
                      {f.remaining > 0 && f.dueDate && <span className={overdue ? "font-medium text-red-600" : undefined}> · échéance {formatDate(f.dueDate)}</span>}
                    </div>
                    <PlateUnderNumber plate={f.plate} />
                  </div>
                </div>
              </td>
              {showClient && (
                <td className={td}>
                  <ClientCell name={f.clientName} />
                </td>
              )}
              <td className={cn(td, vehicleCol)}>{f.plate ? <PlateBadge plate={f.plate} /> : <span className="text-slate-400">—</span>}</td>
              <td className={cn(td, "whitespace-nowrap text-right font-semibold tabular-nums text-slate-900")}>{formatMoney(f.total)}</td>
              <td className={cn(td, "whitespace-nowrap text-right tabular-nums")}>
                <Remaining f={f} />
              </td>
              <td className={td}>
                <InvoiceStatusBadge status={f.status} />
              </td>
              <td className="pr-4">
                <RowChevron />
              </td>
            </tr>
          );
        })}
      </ListTable>
      <MobileList>
        {rows.map((f) => (
          <MobileRow key={f.id} onClick={() => open(f)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{number(f)}</span>
              <span className="font-semibold tabular-nums">{formatMoney(f.total)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <InvoiceStatusBadge status={f.status} />
              <span>{formatDate(f.date)}</span>
              {showClient && <span>{f.clientName}</span>}
              {f.remaining > 0 && <span className="font-semibold text-red-600">Reste {formatMoney(f.remaining)}</span>}
            </div>
          </MobileRow>
        ))}
      </MobileList>
      {more}
    </>
  );
}
