import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Car, ChevronRight, FileText, Phone, Plus, Receipt } from "lucide-react";
import { today, type Client, type Line, type Vehicle } from "@garage/shared";
import { api, useAction } from "../api";
import { ClientFormModal, ClientPicker, FieldWithAction, FormSection, VehicleFormModal, VehicleSelect } from "../components/forms";
import { LinesEditor } from "../components/LinesEditor";
import { PlateBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { Button, Card, Field, Input, PageHeader, Textarea, cn } from "../components/ui";
import { ClientAvatar } from "./clients/ClientAvatar";

/** Parties communes aux devis et factures. */

const sectionLabel = "mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400";

type PartyClient = Pick<Client, "id" | "name" | "phone"> & { type?: Client["type"] };
type PartyVehicle = Pick<Vehicle, "id" | "plate"> & { brand?: string; model?: string; label?: string };

/** Carte « Client » + « Véhicule » en tête d'un devis ou d'une facture. */
export function DocumentParties({ client, vehicle, children }: { client: PartyClient; vehicle: PartyVehicle | null; children?: ReactNode }) {
  const vehicleName = vehicle ? vehicle.label?.trim() || [vehicle.brand, vehicle.model].filter(Boolean).join(" ") : "";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className={sectionLabel}>Client</div>
        <Link to={`/clients/${client.id}`} className="group flex items-center gap-3">
          <ClientAvatar name={client.name} type={client.type ?? "particulier"} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{client.name}</div>
            <div className="text-sm text-slate-500">{client.type ? (client.type === "societe" ? "Société" : "Particulier") : "Voir la fiche client"}</div>
          </div>
          <ChevronRight className="ml-auto size-5 shrink-0 text-slate-300 group-hover:text-slate-500" />
        </Link>
        {client.phone && (
          <a
            href={`tel:${client.phone}`}
            className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold tabular-nums text-slate-800 transition-colors hover:bg-slate-50"
          >
            <Phone className="size-4" /> Appeler · {client.phone}
          </a>
        )}
      </div>
      <div className="p-5">
        <div className={sectionLabel}>Véhicule</div>
        {vehicle ? (
          <Link to={`/vehicules/${vehicle.id}`} className="group flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Car className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{vehicleName || "Véhicule"}</div>
              <PlateBadge plate={vehicle.plate} />
            </div>
            <ChevronRight className="ml-auto size-5 shrink-0 text-slate-300 group-hover:text-slate-500" />
          </Link>
        ) : (
          <div className="text-sm text-slate-400">Aucun véhicule rattaché</div>
        )}
      </div>
      {children}
    </section>
  );
}

const NOTICE_TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600",
  blue: "border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
} as const;

/** Bandeau d'information (brouillon, document verrouillé…). */
export function Notice({ tone, icon, children }: { tone: keyof typeof NOTICE_TONES; icon: ReactNode; children: ReactNode }) {
  return <div className={cn("mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0", NOTICE_TONES[tone])}>{icon}<div>{children}</div></div>;
}

const idParam = (value: string | null) => (value ? Number(value) || null : null);

/** Création d'un devis ou d'une facture ; ?clientId= et ?vehicleId= présélectionnent le client et le véhicule. */
export function NewDocumentPage({ kind }: { kind: "quote" | "invoice" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [clientId, setClientId] = useState<number | null>(() => idParam(params.get("clientId")));
  const [vehicleId, setVehicleId] = useState<number | null>(() => idParam(params.get("vehicleId")));
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [creatingClient, setCreatingClient] = useState(false);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const create = useAction((body: unknown) => api<{ id: number }>(kind === "quote" ? "/api/quotes" : "/api/invoices", "POST", body));

  const submit = () => {
    if (!clientId) return toast.error("Choisissez un client");
    create.mutate(
      { clientId, vehicleId, date, notes, workDone, lines },
      {
        onSuccess: (doc) => {
          toast.success(kind === "quote" ? "Devis créé" : "Facture brouillon créée");
          navigate(kind === "quote" ? `/devis/${doc.id}` : `/factures/${doc.id}`);
        },
        onError: toast.error,
      },
    );
  };

  return (
    <>
      <PageHeader
        title={kind === "quote" ? "Nouveau devis" : "Nouvelle facture"}
        subtitle={kind === "quote" ? "Proposition de prix pour un client" : "La facture est créée en brouillon, puis validée"}
      />
      <Card className="mb-5">
        <div className="space-y-6">
          <FormSection title="Client et véhicule">
            <div className="grid gap-4 md:grid-cols-3">
              <FieldWithAction label="Client" required action="Nouveau client" onAction={() => setCreatingClient(true)}>
                <ClientPicker
                  value={clientId}
                  onChange={(id) => {
                    setClientId(id);
                    setVehicleId(null);
                  }}
                />
              </FieldWithAction>
              <FieldWithAction label="Véhicule" action="Nouveau véhicule" onAction={() => setCreatingVehicle(true)}>
                <VehicleSelect clientId={clientId} value={vehicleId} onChange={setVehicleId} />
              </FieldWithAction>
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
          </FormSection>
          <FormSection title="Contenu">
            <div className="space-y-4">
              {kind === "invoice" && (
                <Field label="Travaux réalisés">
                  <Textarea value={workDone} rows={2} placeholder="Ex. : Vidange, remplacement des plaquettes…" onChange={(e) => setWorkDone(e.target.value)} />
                </Field>
              )}
              <Field label="Notes (imprimées sur le document)">
                <Textarea value={notes} rows={2} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </FormSection>
        </div>
      </Card>
      <Card title="Lignes" className="mb-5">
        <LinesEditor lines={lines} onChange={setLines} />
      </Card>
      <div className="flex justify-end">
        <Button size="lg" icon={kind === "quote" ? <FileText className="size-5" /> : <Receipt className="size-5" />} onClick={submit} loading={create.isPending}>
          {kind === "quote" ? "Créer le devis" : "Créer la facture (brouillon)"}
        </Button>
      </div>

      <ClientFormModal
        open={creatingClient}
        onClose={() => setCreatingClient(false)}
        onSaved={(c) => {
          setClientId(c.id);
          setVehicleId(null);
        }}
      />
      <VehicleFormModal
        open={creatingVehicle}
        onClose={() => setCreatingVehicle(false)}
        clientId={clientId}
        onSaved={(v) => {
          setClientId(v.clientId);
          setVehicleId(v.id);
        }}
      />
    </>
  );
}