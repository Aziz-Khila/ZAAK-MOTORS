import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Calendar, Car, ChevronRight, FileText, Fingerprint, Fuel, Gauge, Package, Pencil, Phone, Plus, Receipt, StickyNote, Tag, Trash2 } from "lucide-react";
import { formatDate, formatMoney, formatQuantity, fuelLabel, type VehicleDetail } from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { VehicleFormModal } from "../../components/forms";
import { PlateBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { InfoRow, Kpi } from "../../components/tiles";
import { Button, Card, ConfirmButton, EmptyState, ErrorBox, LinkButton, PageHeader, Spinner, Table, Tabs, td, th } from "../../components/ui";
import { ClientAvatar } from "../clients/ClientAvatar";
import { InvoicesTable, QuotesTable } from "../history";

export function VehiclePage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: v, isLoading, error } = useApi<VehicleDetail>(`/api/vehicles/${id}`);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"devis" | "factures" | "pieces">("devis");
  const remove = useAction(() => api(`/api/vehicles/${id}`, "DELETE"));

  if (error) return <ErrorBox error={error} />;
  if (isLoading || !v) return <Spinner />;

  const name = [v.brand, v.model].filter(Boolean).join(" ") || "Véhicule";
  const lastQuote = v.quotes[0]?.date;

  return (
    <>
      <PageHeader
        title={name}
        subtitle={`Ajouté le ${formatDate(v.createdAt)}`}
        actions={
          <>
            <LinkButton to={`/devis/nouveau?clientId=${v.clientId}&vehicleId=${v.id}`} icon={<Plus className="size-5" />}>
              Nouveau devis
            </LinkButton>
            <Button variant="secondary" icon={<Pencil className="size-5" />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <ConfirmButton
              variant="ghost"
              icon={<Trash2 className="size-5" />}
              message="Supprimer ce véhicule ?"
              onConfirm={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Véhicule supprimé");
                    navigate("/vehicules");
                  },
                  onError: toast.error,
                })
              }
            >
              Supprimer
            </ConfirmButton>
          </>
        }
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 p-5">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Car className="size-7" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="truncate text-lg font-bold text-slate-900">{name}</div>
              <PlateBadge plate={v.plate} />
            </div>
          </div>
          <div className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Propriétaire</div>
            <Link to={`/clients/${v.client.id}`} className="group flex items-center gap-3">
              <ClientAvatar name={v.client.name} type={v.client.type} />
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{v.client.name}</div>
                <div className="text-sm text-slate-500">{v.client.type === "societe" ? "Société" : "Particulier"}</div>
              </div>
              <ChevronRight className="ml-auto size-5 shrink-0 text-slate-300 group-hover:text-slate-500" />
            </Link>
            {v.client.phone && (
              <a
                href={`tel:${v.client.phone}`}
                className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold tabular-nums text-slate-800 transition-colors hover:bg-slate-50"
              >
                <Phone className="size-4" /> Appeler · {v.client.phone}
              </a>
            )}
          </div>
          {v.notes && (
            <div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <StickyNote className="size-3.5" /> Notes particulières
              </div>
              <div className="whitespace-pre-line">{v.notes}</div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi icon={<Receipt className="size-4" />} label="Montant total dépensé" value={formatMoney(v.totalSpent)} tone="text-blue-700" hint={`${v.invoices.length} facture(s)`} />
            <Kpi
              icon={<FileText className="size-4" />}
              label="Devis"
              value={v.quotes.length}
              tone="text-slate-900"
              hint={lastQuote ? `Dernier devis le ${formatDate(lastQuote)}` : "Aucun devis"}
            />
            <Kpi icon={<Package className="size-4" />} label="Pièces remplacées" value={v.replacedParts.length} tone="text-slate-900" hint="Sur les factures validées" />
          </div>

          <Card title="Caractéristiques" className="flex-1">
            <div className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
              <InfoRow icon={<Tag className="size-4" />} label="Marque" value={v.brand} />
              <InfoRow icon={<Car className="size-4" />} label="Modèle" value={v.model} />
              <InfoRow icon={<Calendar className="size-4" />} label="Année" value={v.year ? String(v.year) : ""} />
              <InfoRow icon={<Fuel className="size-4" />} label="Carburant" value={fuelLabel(v.fuel)} />
              <InfoRow icon={<Gauge className="size-4" />} label="Kilométrage" value={v.mileage ? `${v.mileage.toLocaleString("fr-FR")} km` : ""} />
              <InfoRow icon={<Fingerprint className="size-4" />} label="VIN / n° de châssis" value={v.vin} mono />
            </div>
          </Card>
        </div>
      </div>

      <Card title="Historique">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "devis", label: `Devis (${v.quotes.length})` },
            { value: "factures", label: `Factures (${v.invoices.length})` },
            { value: "pieces", label: `Pièces remplacées (${v.replacedParts.length})` },
          ]}
        />
        {tab === "pieces" &&
          (v.replacedParts.length === 0 ? (
            <EmptyState>Aucune pièce facturée pour ce véhicule</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Km</th>
                  <th className={th}>Pièce</th>
                  <th className={th}>Réf.</th>
                  <th className={`${th} text-right`}>Qté</th>
                  <th className={th}>Facture</th>
                </tr>
              </thead>
              <tbody>
                {v.replacedParts.map((p, i) => (
                  <tr key={i}>
                    <td className={td}>{formatDate(p.date)}</td>
                    <td className={`${td} tabular-nums`}>{p.mileage ? p.mileage.toLocaleString("fr-FR") : "—"}</td>
                    <td className={`${td} font-semibold`}>{p.designation}</td>
                    <td className={`${td} text-slate-500`}>{p.reference}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatQuantity(p.quantity)}</td>
                    <td className={td}>{p.invoiceNumber}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ))}
        {tab === "devis" && <QuotesTable rows={v.quotes} showClient={false} />}
        {tab === "factures" && <InvoicesTable rows={v.invoices} showClient={false} />}
      </Card>

      <VehicleFormModal open={editing} onClose={() => setEditing(false)} vehicle={v} />
    </>
  );
}
