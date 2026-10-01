import { useEffect, useState, type ComponentType, type InputHTMLAttributes, type ReactNode } from "react";
import { Building2, Car, Fingerprint, Hash, Mail, MapPin, Pencil, Phone, Plus, Tag, UserPlus, UserRound } from "lucide-react";
import {
  CLIENT_TYPES,
  FUEL_TYPES,
  type Client,
  type ClientInput,
  type ClientListItem,
  type Vehicle,
  type VehicleInput,
  type VehicleListItem,
} from "@garage/shared";
import { api, useAction, useApi } from "../api";
import { IntInput, isIncompleteTuPlate, PlateInput } from "./inputs";
import { useToast } from "./Toast";
import { Button, Field, Input, Modal, Select, Textarea, cn } from "./ui";

const emptyClient = (): Required<ClientInput> => ({
  type: "particulier",
  name: "",
  phone: "",
  phone2: "",
  address: "",
  email: "",
  taxId: "",
  notes: "",
});

/** Champ de formulaire avec un lien d'action à droite du libellé (ex. « + Nouveau client »). */
export function FieldWithAction({
  label,
  required,
  action,
  onAction,
  children,
}: {
  label: string;
  required?: boolean;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
        >
          <Plus className="size-4" />
          {action}
        </button>
      </div>
      {children}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      {children}
    </div>
  );
}

/** Titre de fenêtre : pastille d'icône, titre et sous-titre. */
export function ModalTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</span>
      <span>
        {title}
        <span className="block text-sm font-normal text-slate-500">{subtitle}</span>
      </span>
    </span>
  );
}

export function IconInput({ icon, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        className={cn(
          "h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** Choix exclusif entre quelques options, présenté en boutons segmentés. */
function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon: ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
              active ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className={cn("size-4", active && "text-blue-600")} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const CLIENT_TYPE_ICONS = { particulier: UserRound, societe: Building2 } as const;

function ClientFields({ value, onChange }: { value: Required<ClientInput>; onChange: (v: Required<ClientInput>) => void }) {
  const set = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) => onChange({ ...value, [k]: v });
  const isCompany = value.type === "societe";
  return (
    <div className="space-y-6">
      <FormSection title="Identité">
        <div className="space-y-4">
          <SegmentedControl
            label="Type de client"
            value={value.type}
            onChange={(t) => set("type", t)}
            options={CLIENT_TYPES.map((t) => ({ value: t.value, label: t.label, icon: CLIENT_TYPE_ICONS[t.value] }))}
          />
          <div className={cn("grid gap-4", isCompany && "sm:grid-cols-2")}>
            <Field label={isCompany ? "Raison sociale" : "Nom et prénom"} required>
              <IconInput
                icon={isCompany ? <Building2 className="size-4" /> : <UserRound className="size-4" />}
                value={value.name}
                placeholder={isCompany ? "Ex. : Société Transport Sud" : "Ex. : Mohamed Ben Ali"}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>
            {isCompany && (
              <Field label="Matricule fiscal">
                <IconInput icon={<Hash className="size-4" />} value={value.taxId} onChange={(e) => set("taxId", e.target.value)} />
              </Field>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title="Coordonnées">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <IconInput icon={<Phone className="size-4" />} value={value.phone} inputMode="tel" placeholder="Ex. : 22 123 456" onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Autre téléphone">
            <IconInput icon={<Phone className="size-4" />} value={value.phone2} inputMode="tel" placeholder="Facultatif" onChange={(e) => set("phone2", e.target.value)} />
          </Field>
          <Field label="Email">
            <IconInput icon={<Mail className="size-4" />} value={value.email} type="email" placeholder="Facultatif" onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Adresse">
            <IconInput icon={<MapPin className="size-4" />} value={value.address} placeholder="Ville, rue…" onChange={(e) => set("address", e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Notes">
        <Textarea value={value.notes} rows={2} placeholder="Informations utiles : préférences, remarques…" onChange={(e) => set("notes", e.target.value)} />
      </FormSection>
    </div>
  );
}

export function ClientFormModal({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  onSaved?: (c: Client) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState(emptyClient());
  useEffect(() => {
    if (open) setForm(client ? { ...emptyClient(), ...client } : emptyClient());
  }, [open, client]);
  const save = useAction((data: ClientInput) =>
    client ? api<Client>(`/api/clients/${client.id}`, "PUT", data) : api<Client>("/api/clients", "POST", data),
  );
  const submit = () =>
    save.mutate(form, {
      onSuccess: (c) => {
        toast.success(client ? "Client modifié" : "Client créé");
        onSaved?.(c);
        onClose();
      },
      onError: toast.error,
    });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <ModalTitle
          icon={client ? <Pencil className="size-5" /> : <UserPlus className="size-5" />}
          title={client ? "Modifier le client" : "Nouveau client"}
          subtitle={client ? "Mettez à jour les informations du client" : "Seul le nom est obligatoire"}
        />
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ClientFields value={form} onChange={setForm} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

type VehicleForm = Omit<Required<VehicleInput>, "clientId"> & { clientId: number | null };

const emptyVehicle = (clientId: number | null = null): VehicleForm => ({
  clientId,
  plate: "",
  brand: "Mercedes",
  model: "",
  year: null,
  vin: "",
  mileage: null,
  fuel: "",
  notes: "",
});

function VehicleFields({
  value,
  onChange,
}: {
  value: Omit<VehicleForm, "clientId">;
  onChange: (v: Omit<VehicleForm, "clientId">) => void;
}) {
  const set = <K extends keyof VehicleForm>(k: K, v: VehicleForm[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-6">
      <FormSection title="Identification">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Immatriculation" required>
            <PlateInput value={value.plate} onChange={(p) => set("plate", p)} />
          </Field>
          <Field label="VIN / n° de châssis">
            <IconInput
              icon={<Fingerprint className="size-4" />}
              value={value.vin}
              placeholder="Ex. : WDD2050421F123456"
              className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
              onChange={(e) => set("vin", e.target.value.toUpperCase())}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Caractéristiques">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Marque">
            <IconInput icon={<Tag className="size-4" />} value={value.brand} placeholder="Mercedes, BMW…" onChange={(e) => set("brand", e.target.value)} />
          </Field>
          <Field label="Modèle">
            <IconInput icon={<Car className="size-4" />} value={value.model} placeholder="Classe C, GLA…" onChange={(e) => set("model", e.target.value)} />
          </Field>
          <Field label="Année">
            <IntInput value={value.year} onChange={(v) => set("year", v)} placeholder="2018" grouping={false} maxDigits={4} />
          </Field>
          <Field label="Kilométrage">
            <IntInput value={value.mileage} onChange={(v) => set("mileage", v)} placeholder="0" suffix="km" />
          </Field>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Carburant</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Carburant">
              {FUEL_TYPES.map((f) => {
                const active = value.fuel === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set("fuel", active ? "" : f.value)}
                    className={cn(
                      "h-11 rounded-xl border px-3.5 text-sm font-semibold transition",
                      active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Notes particulières">
        <Textarea value={value.notes} rows={2} placeholder="Particularités, historique, remarques…" onChange={(e) => set("notes", e.target.value)} />
      </FormSection>
    </div>
  );
}

export function VehicleFormModal({
  open,
  onClose,
  vehicle,
  clientId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  vehicle?: Vehicle | null;
  clientId?: number | null;
  onSaved?: (v: Vehicle) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<VehicleForm>(emptyVehicle());
  const [creatingClient, setCreatingClient] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForm(vehicle ? { ...emptyVehicle(), ...vehicle } : emptyVehicle(clientId ?? null));
    setCreatingClient(false);
  }, [open, vehicle, clientId]);
  const save = useAction((data: VehicleForm) =>
    vehicle ? api<Vehicle>(`/api/vehicles/${vehicle.id}`, "PUT", data) : api<Vehicle>("/api/vehicles", "POST", data),
  );
  const submit = () => {
    if (!form.clientId) return toast.error("Choisissez le client propriétaire");
    if (isIncompleteTuPlate(form.plate)) return toast.error("Immatriculation incomplète : complétez les deux numéros");
    save.mutate(form, {
      onSuccess: (v) => {
        toast.success(vehicle ? "Véhicule modifié" : "Véhicule ajouté");
        onSaved?.(v);
        onClose();
      },
      onError: toast.error,
    });
  };
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="lg"
        title={
          <ModalTitle
            icon={vehicle ? <Pencil className="size-5" /> : <Car className="size-5" />}
            title={vehicle ? "Modifier le véhicule" : "Nouveau véhicule"}
            subtitle={vehicle ? "Mettez à jour les informations du véhicule" : "Le propriétaire et l'immatriculation sont obligatoires"}
          />
        }
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={submit} loading={save.isPending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <FormSection title="Propriétaire">
            <FieldWithAction label="Client propriétaire" required action="Nouveau client" onAction={() => setCreatingClient(true)}>
              <ClientPicker value={form.clientId} onChange={(id) => setForm({ ...form, clientId: id })} />
            </FieldWithAction>
          </FormSection>
          <VehicleFields value={form} onChange={(v) => setForm({ ...form, ...v })} />
        </div>
      </Modal>
      <ClientFormModal
        open={open && creatingClient}
        onClose={() => setCreatingClient(false)}
        onSaved={(c) => setForm((f) => ({ ...f, clientId: c.id }))}
      />
    </>
  );
}

/** Liste des véhicules du client choisi. */
export function VehicleSelect({ clientId, value, onChange }: { clientId: number | null; value: number | null; onChange: (id: number | null) => void }) {
  const { data } = useApi<VehicleListItem[]>(clientId ? `/api/vehicles?clientId=${clientId}` : null);
  return (
    <Select
      value={value ? String(value) : ""}
      disabled={!clientId}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      placeholder={clientId ? "Aucun véhicule" : "Choisissez d'abord le client"}
      options={(data ?? []).map((v) => ({ value: String(v.id), label: `${v.plate} · ${[v.brand, v.model].filter(Boolean).join(" ")}` }))}
    />
  );
}

/** Choix d'un client par recherche (nom, téléphone, plaque). */
export function ClientPicker({
  value,
  onChange,
  placeholder = "Tapez un nom, un téléphone ou une plaque…",
}: {
  value: number | null;
  onChange: (id: number | null, client?: ClientListItem) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: selected } = useApi<Client>(value ? `/api/clients/${value}` : null);
  const { data: results } = useApi<ClientListItem[]>(open ? `/api/clients?q=${encodeURIComponent(q)}` : null);

  if (value && selected) {
    return (
      <div className="flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3">
        <span className="font-semibold">
          {selected.name} {selected.phone && <span className="font-normal text-slate-500">· {selected.phone}</span>}
        </span>
        <button className="text-sm font-semibold text-blue-600" onClick={() => onChange(null)} type="button">
          Changer
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results && (
        <div className="absolute left-0 right-0 top-12 z-40 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {results.length === 0 && <div className="px-4 py-3 text-slate-500">Aucun client trouvé</div>}
          {results.slice(0, 30).map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(c.id, c);
                setOpen(false);
                setQ("");
              }}
              className={cn("block w-full px-4 py-2 text-left hover:bg-blue-50")}
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-slate-500">{[c.phone, c.plates].filter(Boolean).join(" · ")}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
