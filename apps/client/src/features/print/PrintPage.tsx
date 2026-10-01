import { useEffect } from "react";
import { useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import {
  formatDate,
  formatMoney,
  formatQuantity,
  fuelLabel,
  paymentMethodLabel,
  type InvoiceDetail,
  type Line,
  type QuoteDetail,
} from "@garage/shared";
import { useApi, useSettings } from "../../api";
import { Button, ErrorBox, Spinner } from "../../components/ui";

type Doc = (QuoteDetail & { kind: "quote" }) | (InvoiceDetail & { kind: "invoice" });

/** totalOnly : le client ne voit que le montant de chaque ligne (sans référence, quantité ni prix unitaire). */
function LinesTable({ lines, totalOnly }: { lines: Line[]; totalOnly?: boolean }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-slate-800 text-left">
          <th className="py-2 pr-2">Désignation</th>
          {!totalOnly && (
            <>
              <th className="w-28 py-2 pr-2">Réf.</th>
              <th className="w-20 py-2 pr-2 text-right">Qté</th>
              <th className="w-28 py-2 pr-2 text-right">P.U.</th>
            </>
          )}
          <th className="w-32 py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className="border-b border-slate-200">
            <td className="py-1.5 pr-2">{l.designation}</td>
            {!totalOnly && (
              <>
                <td className="py-1.5 pr-2 text-slate-600">{l.reference}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {formatQuantity(l.quantity)}
                  {l.type === "main_oeuvre" ? " h" : ""}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(l.unitPrice, false)}</td>
              </>
            )}
            <td className="py-1.5 text-right tabular-nums">{formatMoney(Math.round(l.quantity * l.unitPrice), false)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({ title, lines, totalOnly }: { title: string; lines: Line[]; totalOnly?: boolean }) {
  if (lines.length === 0) return null;
  const total = lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice), 0);
  return (
    <div className="mb-4 break-inside-avoid">
      <div className="mb-1 flex justify-between text-sm font-bold uppercase tracking-wide text-slate-600">
        <span>{title}</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </div>
      <LinesTable lines={lines} totalOnly={totalOnly} />
    </div>
  );
}

export function PrintPage({ kind }: { kind: "quote" | "invoice" }) {
  const id = useParams().id;
  const { data: settings } = useSettings();
  const { data, error } = useApi<QuoteDetail | InvoiceDetail>(kind === "quote" ? `/api/quotes/${id}` : `/api/invoices/${id}`);

  useEffect(() => {
    if (data && settings) document.title = `${kind === "quote" ? "Devis" : "Facture"} ${data.number ?? "brouillon"} - ${data.client.name}`;
  }, [data, settings, kind]);

  if (error) return <ErrorBox error={error} />;
  if (!data || !settings) return <Spinner />;

  const doc = { ...data, kind } as Doc;
  const showVat = doc.vat > 0 || doc.vatRate > 0;
  const title =
    doc.kind === "quote" ? "DEVIS" : doc.status === "brouillon" ? "FACTURE (BROUILLON)" : doc.status === "annulee" ? "FACTURE ANNULÉE" : "FACTURE";
  const footer = doc.kind === "quote" ? settings.quoteFooter : settings.invoiceFooter;

  return (
    <div className="min-h-full bg-slate-200 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-between px-2">
        <Button variant="secondary" icon={<ArrowLeft className="size-5" />} onClick={() => window.close()}>
          Fermer
        </Button>
        <Button icon={<Printer className="size-5" />} onClick={() => window.print()}>
          Imprimer / PDF
        </Button>
      </div>

      <div className="mx-auto min-h-[297mm] max-w-[210mm] bg-white p-[12mm] text-slate-900 shadow-lg print:min-h-0 print:p-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {settings.logo && <img src={settings.logo} alt="" className="max-h-20 max-w-32 object-contain" />}
            <div>
              <div className="text-xl font-bold">{settings.garageName}</div>
              <div className="whitespace-pre-line text-sm text-slate-600">{settings.address}</div>
              <div className="text-sm text-slate-600">{[settings.phone, settings.email].filter(Boolean).join(" · ")}</div>
              {settings.taxId && <div className="text-sm text-slate-600">Matricule fiscal : {settings.taxId}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tracking-wide">{title}</div>
            {doc.number && <div className="text-lg font-bold">N° {doc.number}</div>}
            <div className="text-sm">Date : {formatDate(doc.date)}</div>
            {doc.kind === "quote" && doc.validUntil && <div className="text-sm">Valable jusqu'au : {formatDate(doc.validUntil)}</div>}
            {doc.kind === "invoice" && doc.dueDate && doc.status !== "payee" && <div className="text-sm">Échéance : {formatDate(doc.dueDate)}</div>}
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-300 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Client</div>
            <div className="font-bold">{doc.client.name}</div>
            {doc.client.address && <div className="text-sm">{doc.client.address}</div>}
            {doc.client.phone && <div className="text-sm">Tél. : {doc.client.phone}</div>}
            {doc.client.taxId && <div className="text-sm">MF : {doc.client.taxId}</div>}
          </div>
          <div className="rounded-lg border border-slate-300 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Véhicule</div>
            {doc.vehicle ? (
              <>
                <div className="font-mono text-lg font-bold">{doc.vehicle.plate}</div>
                <div className="text-sm">
                  {[doc.vehicle.brand, doc.vehicle.model, doc.vehicle.year, fuelLabel(doc.vehicle.fuel)].filter(Boolean).join(" · ")}
                </div>
                {doc.vehicle.vin && <div className="text-sm">VIN : {doc.vehicle.vin}</div>}
                {(doc.kind === "invoice" ? doc.mileage : doc.vehicle.mileage) && (
                  <div className="text-sm">
                    Kilométrage : {(doc.kind === "invoice" ? doc.mileage : doc.vehicle.mileage)!.toLocaleString("fr-FR")} km
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500">—</div>
            )}
          </div>
        </div>

        {doc.kind === "invoice" && doc.workDone && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Travaux réalisés</div>
            <div className="whitespace-pre-line text-sm">{doc.workDone}</div>
          </div>
        )}

        <Section title="Main-d'œuvre" lines={doc.lines.filter((l) => l.type === "main_oeuvre")} totalOnly />
        <Section title="Pièces" lines={doc.lines.filter((l) => l.type === "piece")} />
        <Section title="Autres prestations" lines={doc.lines.filter((l) => l.type === "prestation")} />

        <div className="mt-4 flex justify-end break-inside-avoid">
          <div className="w-72 space-y-1 text-sm">
            {showVat && (
              <>
                <div className="flex justify-between">
                  <span>Total HT</span>
                  <span className="tabular-nums">{formatMoney(doc.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA {doc.vatRate} %</span>
                  <span className="tabular-nums">{formatMoney(doc.vat)}</span>
                </div>
              </>
            )}
            {doc.stamp > 0 && (
              <div className="flex justify-between">
                <span>Timbre fiscal</span>
                <span className="tabular-nums">{formatMoney(doc.stamp)}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-slate-800 pt-1 text-lg font-bold">
              <span>{showVat ? "Total TTC" : "Total"}</span>
              <span className="tabular-nums">{formatMoney(doc.total)}</span>
            </div>
            {doc.kind === "invoice" && doc.status !== "brouillon" && doc.status !== "annulee" && (
              <>
                <div className="flex justify-between">
                  <span>Montant payé</span>
                  <span className="tabular-nums">{formatMoney(doc.paid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Reste à payer</span>
                  <span className="tabular-nums">{formatMoney(doc.total - doc.paid)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {doc.kind === "invoice" && doc.payments.length > 0 && (
          <div className="mt-4 text-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Paiements reçus</div>
            {doc.payments.map((p) => (
              <div key={p.id}>
                {formatDate(p.date)} : {formatMoney(p.amount)} ({paymentMethodLabel(p.method)})
              </div>
            ))}
          </div>
        )}

        {doc.notes && <div className="mt-6 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">{doc.notes}</div>}

        {doc.kind === "quote" && (
          <div className="mt-10 grid grid-cols-2 gap-8 text-sm break-inside-avoid">
            <div />
            <div className="h-24 rounded-lg border border-dashed border-slate-400 p-2 text-slate-500">
              Bon pour accord (date et signature du client)
            </div>
          </div>
        )}

        {footer && <footer className="mt-10 whitespace-pre-line border-t border-slate-200 pt-3 text-center text-xs text-slate-500">{footer}</footer>}
      </div>
    </div>
  );
}
