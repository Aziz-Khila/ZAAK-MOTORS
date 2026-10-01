import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Car, ChevronRight, FileText, Hash, Mail, MapPin, Pencil, Phone, Plus, Receipt, StickyNote, Trash2, Wallet } from "lucide-react";
import { formatDate, formatMoney, fuelLabel, type ClientDetail } from "@garage/shared";
import { api, useAction, useApi } from "../../api";
import { ClientFormModal, VehicleFormModal } from "../../components/forms";
import { PlateBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { InfoRow, Kpi } from "../../components/tiles";
import { Button, Card, ConfirmButton, ErrorBox, LinkButton, PageHeader, Spinner, Tabs } from "../../components/ui";
import { InvoicesTable, QuotesTable } from "../history";
import { ClientAvatar } from "./ClientAvatar";

export function ClientPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: c, isLoading, error } = useApi<ClientDetail>(`/api/clients/${id}`);
  const [editing, setEditing] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [tab, setTab] = useState<"devis" | "factures">("devis");
  const remove = useAction(() => api(`/api/clients/${id}`, "DELETE"));

  if (error) return <ErrorBox error={error} />;
  if (isLoading || !c) return <Spinner />;

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={`Client depuis le ${formatDate(c.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" icon={<Pencil className="size-5" />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <ConfirmButton
              variant="ghost"
              icon={<Trash2 className="size-5" />}
              message="Supprimer ce client ?"
              onConfirm={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Client supprimé");
                    navigate("/clients");
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
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:row-span-2">
          <div className="flex items-center gap-4 border-b border-slate-100 p-5">
            <ClientAvatar name={c.name} type={c.type} size="lg" />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-900">{c.name}</div>
              <div className="text-sm text-slate-500">{c.type === "societe" ? "Société" : "Particulier"}</div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 px-5 py-2">
            <InfoRow icon={<Phone className="size-4" />} label="Téléphone" value={c.phone} href={c.phone ? `tel:${c.phone}` : undefined} />
            {c.phone2 && <InfoRow icon={<Phone className="size-4" />} label="Autre téléphone" value={c.phone2} href={`tel:${c.phone2}`} />}
            <InfoRow icon={<Mail className="size-4" />} label="Email" value={c.email} href={c.email ? `mailto:${c.email}` : undefined} />
            <InfoRow icon={<MapPin className="size-4" />} label="Adresse" value={c.address} />
            {c.type === "societe" && <InfoRow icon={<Hash className="size-4" />} label="Matricule fiscal" value={c.taxId} />}
          </div>
          {c.notes && (
            <div className="mx-5 mb-5 mt-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                <StickyNote className="size-3.5" /> Notes
              </div>
              <div className="whitespace-pre-line">{c.notes}</div>
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          <Kpi
            icon={<Wallet className="size-4" />}
            label="Reste à payer"
            value={formatMoney(c.balance)}
            tone={c.balance > 0 ? "text-red-600" : "text-emerald-700"}
            hint={c.balance > 0 ? "Factures non soldées" : "Client à jour"}
          />
          <Kpi icon={<Receipt className="size-4" />} label="Total facturé" value={formatMoney(c.totalSpent)} tone="text-blue-700" hint={`${c.invoices.length} facture(s)`} />
          <Kpi
            icon={<FileText className="size-4" />}
            label="Devis"
            value={c.quotes.length}
            tone="text-slate-900"
            hint={`${c.vehicles.length} véhicule(s)`}
          />
        </div>

        <Card
          className="lg:col-span-2"
          title={`Véhicules (${c.vehicles.length})`}
          actions={
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAddingVehicle(true)}>
              Ajouter un véhicule
            </Button>
          }
        >
          {c.vehicles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-500">
              <Car className="size-8 text-slate-300" />
              Aucun véhicule enregistré pour ce client
            </div>
          ) : (
            <div className="-my-2 divide-y divide-slate-100">
              {c.vehicles.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Link to={`/vehicules/${v.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Car className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-700">
                          {[v.brand, v.model, v.year].filter(Boolean).join(" ") || "Véhicule"}
                        </span>
                        <PlateBadge plate={v.plate} />
                      </div>
                      <div className="mt-0.5 text-sm text-slate-500">
                        {[fuelLabel(v.fuel), v.mileage ? `${v.mileage.toLocaleString("fr-FR")} km` : ""].filter(Boolean).join(" · ") || "Aucun détail"}
                      </div>
                    </div>
                    <ChevronRight className="ml-auto size-5 shrink-0 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                  <LinkButton to={`/devis/nouveau?clientId=${c.id}&vehicleId=${v.id}`} size="sm" variant="secondary" icon={<Plus className="size-4" />}>
                    Nouveau devis
                  </LinkButton>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Historique">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "devis", label: `Devis (${c.quotes.length})` },
            { value: "factures", label: `Factures (${c.invoices.length})` },
          ]}
        />
        {tab === "devis" && <QuotesTable rows={c.quotes} showClient={false} />}
        {tab === "factures" && <InvoicesTable rows={c.invoices} showClient={false} />}
      </Card>

      <ClientFormModal open={editing} onClose={() => setEditing(false)} client={c} />
      <VehicleFormModal open={addingVehicle} onClose={() => setAddingVehicle(false)} clientId={c.id} />
    </>
  );
}
