import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Coins,
  Database,
  Download,
  FileText,
  FolderOpen,
  HardDriveDownload,
  Hash,
  ImageIcon,
  Info,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Percent,
  Phone,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { formatMoney, lineTotal, type GarageSettings, type Line, type ServiceTemplate } from "@garage/shared";
import { useQueryClient } from "@tanstack/react-query";
import { api, useAction, useApi, useAuthStatus, useSettings } from "../../api";
import { IconInput, ModalTitle } from "../../components/forms";
import { DecimalInput, IntInput, MoneyInput } from "../../components/inputs";
import { LinesEditor } from "../../components/LinesEditor";
import { RowIcon } from "../../components/list";
import { SectionTitle } from "../../components/tiles";
import { useToast } from "../../components/Toast";
import {
  Button,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Tabs,
  Textarea,
  Toggle,
  cn,
} from "../../components/ui";

function resizeImage(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function GarageSettingsForm({ settings }: { settings: GarageSettings }) {
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setForm(settings), [settings]);
  const save = useAction((s: GarageSettings) => api("/api/settings", "PUT", s));
  const set = <K extends keyof GarageSettings>(k: K, v: GarageSettings[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => save.mutate(form, { onSuccess: () => toast.success("Paramètres enregistrés"), onError: toast.error });

  return (
    <div className="space-y-5">
      <Card title={<SectionTitle icon={<Building2 className="size-5" />} title="Informations du garage" subtitle="Imprimées en tête des devis et factures" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom du garage">
            <IconInput icon={<Building2 className="size-4" />} value={form.garageName} onChange={(e) => set("garageName", e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <IconInput icon={<Phone className="size-4" />} value={form.phone} inputMode="tel" onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Adresse">
            <Textarea value={form.address} rows={2} placeholder="Rue, ville…" onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div className="grid gap-4">
            <Field label="Email">
              <IconInput icon={<Mail className="size-4" />} value={form.email} type="email" onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Matricule fiscal">
              <IconInput icon={<Hash className="size-4" />} value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Logo</span>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
              <span className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                {form.logo ? <img src={form.logo} alt="Logo" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="size-6 text-slate-300" />}
              </span>
              <div className="text-sm text-slate-500">{form.logo ? "Logo imprimé sur les documents" : "Aucun logo : ajoutez une image (PNG, JPG)"}</div>
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" size="sm" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
                  Choisir une image
                </Button>
                {form.logo && (
                  <Button variant="ghost" size="sm" onClick={() => set("logo", "")}>
                    Retirer
                  </Button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) set("logo", await resizeImage(file));
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title={<SectionTitle icon={<Coins className="size-5" />} title="Tarifs" subtitle="Valeurs proposées par défaut sur les nouveaux documents" />}>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Taux horaire main-d'œuvre" hint="Prérempli sur chaque ligne de main-d'œuvre">
            <MoneyInput value={form.hourlyRate} onChange={(v) => set("hourlyRate", v ?? 0)} />
          </Field>
          <Field label="Marge par défaut sur les pièces" hint="Pour calculer le prix de vente">
            <DecimalInput value={form.defaultPartMargin} onChange={(v) => set("defaultPartMargin", v ?? 0)} suffix="%" />
          </Field>
          <Field label="Validité des devis">
            <IntInput value={form.quoteValidityDays} onChange={(v) => set("quoteValidityDays", v ?? 0)} suffix="jours" />
          </Field>
          <Field label="Délai de paiement des factures" hint="0 = payable à la livraison">
            <IntInput value={form.invoiceDueDays} onChange={(v) => set("invoiceDueDays", v ?? 0)} suffix="jours" />
          </Field>
        </div>
      </Card>

      <Card title={<SectionTitle icon={<Percent className="size-5" />} title="Taxes" subtitle="TVA et timbre fiscal appliqués aux devis et factures" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <Toggle checked={form.vatEnabled} onChange={(v) => set("vatEnabled", v)} label="Appliquer la TVA" />
            {form.vatEnabled ? (
              <Field label="Taux de TVA">
                <DecimalInput value={form.vatRate} onChange={(v) => set("vatRate", v ?? 0)} suffix="%" className="w-40" />
              </Field>
            ) : (
              <p className="text-sm text-slate-500">TVA désactivée : les documents affichent un seul « Total ».</p>
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <Toggle checked={form.stampEnabled} onChange={(v) => set("stampEnabled", v)} label="Ajouter le timbre fiscal" />
            {form.stampEnabled ? (
              <Field label="Montant du timbre">
                <MoneyInput value={form.stampAmount} onChange={(v) => set("stampAmount", v ?? 0)} className="w-40" />
              </Field>
            ) : (
              <p className="text-sm text-slate-500">Aucun timbre fiscal ajouté aux factures.</p>
            )}
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
          <Info className="mt-0.5 size-4 shrink-0" />
          Les changements s'appliquent aux nouveaux devis et factures ; les documents existants gardent leurs montants.
        </p>
      </Card>

      <Card title={<SectionTitle icon={<FileText className="size-5" />} title="Mentions en bas de page" subtitle="Texte imprimé en pied de page des documents" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Pied de page des devis">
            <Textarea value={form.quoteFooter} rows={3} placeholder="Ex. : Devis gratuit. Pièces garanties 6 mois." onChange={(e) => set("quoteFooter", e.target.value)} />
          </Field>
          <Field label="Pied de page des factures">
            <Textarea value={form.invoiceFooter} rows={3} placeholder="Ex. : Merci de votre confiance. RIB : …" onChange={(e) => set("invoiceFooter", e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 pl-5 shadow-lg backdrop-blur">
        <span className="text-sm text-slate-500">Pensez à enregistrer après chaque modification.</span>
        <Button icon={<Save className="size-5" />} onClick={submit} loading={save.isPending}>
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
}

function TemplateModal({ open, onClose, template }: { open: boolean; onClose: () => void; template: ServiceTemplate | null }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setCategory(template?.category ?? "");
      setLines(template?.lines ?? []);
    }
  }, [open, template]);
  const save = useAction(() => {
    const body = { name, category, notes: "", lines };
    return template ? api(`/api/templates/${template.id}`, "PUT", body) : api("/api/templates", "POST", body);
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <ModalTitle
          icon={template ? <Pencil className="size-5" /> : <Sparkles className="size-5" />}
          title={template ? `Prestation : ${template.name}` : "Nouvelle prestation fréquente"}
          subtitle="Ensemble de lignes ajouté en un clic sur les devis et factures"
        />
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            loading={save.isPending}
            onClick={() =>
              save.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Prestation enregistrée");
                  onClose();
                },
                onError: toast.error,
              })
            }
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la prestation" required>
          <Input value={name} autoFocus placeholder="Ex. : Vidange + filtres" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Catégorie">
          <Input value={category} placeholder="Entretien, Freinage…" onChange={(e) => setCategory(e.target.value)} />
        </Field>
      </div>
      <LinesEditor lines={lines} onChange={setLines} allowTemplates={false} />
      <p className="mt-3 text-sm text-slate-500">
        Les prix des pièces du catalogue et le taux horaire sont remis à jour automatiquement à chaque utilisation.
      </p>
    </Modal>
  );
}

function TemplatesTab() {
  const toast = useToast();
  const { data } = useApi<ServiceTemplate[]>("/api/templates");
  const [editing, setEditing] = useState<ServiceTemplate | null | "new">(null);
  const remove = useAction((id: number) => api(`/api/templates/${id}`, "DELETE"));
  return (
    <Card
      title={<SectionTitle icon={<Sparkles className="size-5" />} title="Prestations fréquentes" subtitle="Ajoutées en un clic sur les devis et factures" />}
      actions={
        <Button icon={<Plus className="size-5" />} onClick={() => setEditing("new")}>
          Nouvelle prestation
        </Button>
      }
    >
      {!data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState icon={<Sparkles className="size-10 text-slate-300" />}>Aucune prestation fréquente</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300">
              <RowIcon tone="bg-blue-50 text-blue-600">
                <Sparkles className="size-5" />
              </RowIcon>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="font-bold tabular-nums text-blue-700">{formatMoney(t.lines.reduce((s, l) => s + lineTotal(l), 0))}</div>
                </div>
                {t.category && <div className="text-xs text-slate-500">{t.category}</div>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.lines.map((l, i) => (
                    <span key={i} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {l.designation}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0">
                <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(t)} />
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-4" />}
                  message={`Supprimer la prestation « ${t.name} » ?`}
                  onConfirm={() => remove.mutate(t.id, { onSuccess: () => toast.success("Prestation supprimée"), onError: toast.error })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <TemplateModal open={editing !== null} onClose={() => setEditing(null)} template={editing === "new" ? null : editing} />
    </Card>
  );
}

function BackupTab() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data } = useApi<{ folder: string; files: { name: string; size: number; date: string }[] }>("/api/backup");
  const now = useAction(() => api("/api/backup/now", "POST"));
  const restore = useAction((file: File) => api("/api/backup/restore", "POST", file));

  return (
    <div className="space-y-5">
      <Card title={<SectionTitle icon={<HardDriveDownload className="size-5" />} title="Sauvegarde" subtitle="Protégez vos données contre une panne du PC" />}>
        <p className="mb-4 text-slate-600">
          Une sauvegarde automatique est faite chaque jour sur ce PC (les 30 dernières sont gardées). Pensez à exporter régulièrement une copie sur une clé USB ou sur votre téléphone.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/backup/export"
            download
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Download className="size-5" /> Exporter une sauvegarde
          </a>
          <Button
            variant="secondary"
            icon={<HardDriveDownload className="size-5" />}
            loading={now.isPending}
            onClick={() => now.mutate(undefined, { onSuccess: () => toast.success("Sauvegarde effectuée"), onError: toast.error })}
          >
            Sauvegarder maintenant sur ce PC
          </Button>
        </div>
        {data && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <FolderOpen className="size-4 shrink-0" /> Dossier des sauvegardes : <span className="font-mono text-xs">{data.folder}</span>
          </p>
        )}
      </Card>

      <Card title={<SectionTitle icon={<RotateCcw className="size-5" />} title="Restaurer une sauvegarde" subtitle="À utiliser uniquement en cas de problème" />}>
        <p className="mb-4 text-slate-600">
          Remplace toutes les données actuelles par celles du fichier choisi. Une copie des données actuelles est faite juste avant, par sécurité.
        </p>
        <Button variant="danger" icon={<Upload className="size-5" />} loading={restore.isPending} onClick={() => fileRef.current?.click()}>
          Choisir un fichier de sauvegarde (.db)
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".db"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !window.confirm(`Restaurer « ${file.name} » ? Les données actuelles seront remplacées.`)) return;
            restore.mutate(file, {
              onSuccess: () => {
                toast.success("Sauvegarde restaurée");
                setTimeout(() => window.location.assign("/"), 800);
              },
              onError: toast.error,
            });
          }}
        />
      </Card>

      {data && data.files.length > 0 && (
        <Card title={<SectionTitle icon={<Database className="size-5" />} title="Sauvegardes présentes sur ce PC" subtitle={`${data.files.length} fichier(s)`} />}>
          <ul className="-my-1 divide-y divide-slate-100 text-sm">
            {data.files.slice(0, 15).map((f) => (
              <li key={f.name} className="flex items-center gap-3 py-2.5">
                <RowIcon>
                  <Database className="size-4" />
                </RowIcon>
                <span className="min-w-0 flex-1 truncate font-mono text-slate-800">{f.name}</span>
                <span className="whitespace-nowrap text-slate-500">
                  {new Date(f.date).toLocaleString("fr-FR")} · {(f.size / 1024).toFixed(0)} Ko
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const pinInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
  <Input
    type="password"
    inputMode="numeric"
    autoComplete="new-password"
    maxLength={8}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
    className="tracking-[0.3em] placeholder:tracking-normal"
  />
);

function SecurityTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useAuthStatus();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const save = useAction((body: { currentPin: string; newPin: string | null }) => api<{ enabled: boolean }>("/api/auth/pin", "PUT", body));
  if (!data) return <Spinner />;

  const submit = (newPin: string | null) => {
    if (data.enabled && !current) return toast.error("Saisissez le code actuel");
    if (newPin !== null) {
      if (!/^\d{4,8}$/.test(newPin)) return toast.error("Le nouveau code doit contenir de 4 à 8 chiffres");
      if (newPin !== confirm) return toast.error("Les deux saisies du nouveau code ne correspondent pas");
    }
    save.mutate(
      { currentPin: current, newPin },
      {
        onSuccess: () => {
          toast.success(newPin === null ? "Code désactivé" : data.enabled ? "Code modifié" : "Code activé");
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: toast.error,
      },
    );
  };

  return (
    <Card title={<SectionTitle icon={<KeyRound className="size-5" />} title="Code d'accès" subtitle="Protège le logiciel sur ce PC et sur les tablettes du garage" />}>
      <div
        className={cn(
          "mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm",
          data.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900",
        )}
      >
        {data.enabled ? <ShieldCheck className="size-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="size-5 shrink-0 text-amber-600" />}
        <div>
          <div className="font-semibold">{data.enabled ? "Code activé" : "Aucun code"}</div>
          {data.enabled
            ? "Chaque appareil doit saisir le code une fois ; il reste ouvert jusqu'à ce que vous cliquiez sur « Verrouiller »."
            : "Toute personne connectée au Wi-Fi du garage peut ouvrir le logiciel avec l'adresse de la tablette."}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {data.enabled && <Field label="Code actuel">{pinInput(current, setCurrent, "Code actuel")}</Field>}
        <Field label={data.enabled ? "Nouveau code" : "Code (4 à 8 chiffres)"}>{pinInput(next, setNext, "Ex. : 2468")}</Field>
        <Field label="Confirmer le code">{pinInput(confirm, setConfirm, "Ressaisir")}</Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button icon={<KeyRound className="size-5" />} loading={save.isPending} onClick={() => submit(next)}>
          {data.enabled ? "Changer le code" : "Activer le code"}
        </Button>
        {data.enabled && (
          <>
            <Button variant="secondary" icon={<Lock className="size-5" />} onClick={() => void api("/api/auth/lock", "POST").finally(() => qc.invalidateQueries())}>
              Verrouiller maintenant
            </Button>
            <Button variant="danger" icon={<ShieldOff className="size-5" />} loading={save.isPending} onClick={() => submit(null)}>
              Désactiver le code
            </Button>
          </>
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 text-sm text-slate-500">
        <Info className="mt-0.5 size-4 shrink-0" />
        Code oublié ? Sur le PC du garage, supprimez le fichier « pin.json » du dossier « data » du logiciel, puis rechargez la page.
      </p>
    </Card>
  );
}

export function SettingsPage() {
  const { data: settings } = useSettings();
  const [tab, setTab] = useState<"garage" | "prestations" | "sauvegarde" | "securite">("garage");
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Informations du garage, tarifs, taxes, prestations, sauvegardes et code d'accès" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "garage", label: "Garage, tarifs et taxes" },
          { value: "prestations", label: "Prestations fréquentes" },
          { value: "sauvegarde", label: "Sauvegarde" },
          { value: "securite", label: "Code d'accès" },
        ]}
      />
      {tab === "garage" && (settings ? <GarageSettingsForm settings={settings} /> : <Spinner />)}
      {tab === "prestations" && <TemplatesTab />}
      {tab === "sauvegarde" && <BackupTab />}
      {tab === "securite" && <SecurityTab />}
    </>
  );
}
