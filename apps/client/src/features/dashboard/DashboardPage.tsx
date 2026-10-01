import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  Cog,
  Disc3,
  Droplets,
  FileText,
  Mail,
  MapPin,
  MoveVertical,
  Phone,
  Receipt,
  ScanLine,
  Settings2,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { formatMoney, lineTotal, today, type Appointment, type Dashboard, type ServiceTemplate } from "@garage/shared";
import { useApi, useSettings } from "../../api";
import { SummaryTile } from "../../components/tiles";
import { RemindersPanel } from "../agenda/RemindersPanel";
import { EmptyState, cn } from "../../components/ui";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  entretien: Droplets,
  freinage: Disc3,
  moteur: Cog,
  transmission: Settings2,
  suspension: MoveVertical,
  diagnostic: ScanLine,
};

const categoryIcon = (category: string) => CATEGORY_ICONS[category.trim().toLowerCase()] ?? Wrench;

const todayLabel = () => {
  const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function HeroAction({ to, icon, children, primary }: { to: string; icon: ReactNode; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl px-4 font-semibold transition-colors",
        primary ? "bg-white text-black hover:bg-neutral-200" : "border border-white/20 text-white hover:bg-white/10",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function ContactChip({ icon, children, href }: { icon: ReactNode; children: ReactNode; href?: string }) {
  const cls = "inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-neutral-200";
  return href ? (
    <a href={href} className={cn(cls, "transition-colors hover:bg-white/15")}>
      {icon}
      {children}
    </a>
  ) : (
    <span className={cls}>
      {icon}
      {children}
    </span>
  );
}

function ServiceCategory({ category, services }: { category: string; services: ServiceTemplate[] }) {
  const Icon = categoryIcon(category);
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold text-slate-900">{category}</h3>
          <p className="text-xs text-slate-500">
            {services.length} prestation{services.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>
      <ul className="divide-y divide-slate-100 px-5">
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0 truncate text-slate-700">{s.name}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatMoney(s.lines.reduce((sum, l) => sum + lineTotal(l), 0))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Page d'accueil : vitrine du garage (logo, coordonnées, services) et accès rapides. */
export function DashboardPage() {
  const { data: settings } = useSettings();
  const { data: templates } = useApi<ServiceTemplate[]>("/api/templates");
  const { data: dash } = useApi<Dashboard>("/api/dashboard", { refetchInterval: 60000 });
  const { data: allToday } = useApi<Appointment[]>(`/api/appointments?from=${today()}&to=${today()}`);
  const todayAppointments = allToday?.filter((a) => !a.done);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const nextAppointment = todayAppointments?.find((a) => a.time >= nowTime) ?? todayAppointments?.find((a) => !a.time);
  const name = settings?.garageName || "ZAAK MOTORS";

  const categories = new Map<string, ServiceTemplate[]>();
  for (const t of templates ?? []) {
    const key = t.category.trim() || "Autres";
    categories.set(key, [...(categories.get(key) ?? []), t]);
  }
  const hasContact = !!(settings?.address || settings?.phone || settings?.email);

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-3xl bg-black px-6 py-10 text-center shadow-xl md:py-14"
        style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(255,255,255,0.12), transparent 60%)" }}
      >
        <img src="/logo-full.png" alt={name} className="mx-auto w-full max-w-sm md:max-w-md" />
        <p className="mx-auto mt-6 max-w-xl text-neutral-300">Entretien, diagnostic et réparation de votre Mercedes-Benz, par des spécialistes.</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {settings?.address && <ContactChip icon={<MapPin className="size-4" />}>{settings.address}</ContactChip>}
          {settings?.phone && (
            <ContactChip icon={<Phone className="size-4" />} href={`tel:${settings.phone}`}>
              {settings.phone}
            </ContactChip>
          )}
          {settings?.email && (
            <ContactChip icon={<Mail className="size-4" />} href={`mailto:${settings.email}`}>
              {settings.email}
            </ContactChip>
          )}
          {settings && !hasContact && (
            <Link to="/parametres" className="text-sm text-neutral-500 transition-colors hover:text-neutral-300">
              Ajouter l'adresse et le téléphone du garage dans Paramètres →
            </Link>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <HeroAction to="/devis/nouveau" icon={<FileText className="size-5" />} primary>
            Nouveau devis
          </HeroAction>
          <HeroAction to="/factures/nouvelle" icon={<Receipt className="size-5" />}>
            Nouvelle facture
          </HeroAction>
        </div>
        <p className="mt-8 text-xs uppercase tracking-[0.25em] text-neutral-600">{todayLabel()}</p>
      </section>

      <RemindersPanel />

      {dash && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">En ce moment</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/agenda" className="block rounded-2xl transition hover:ring-2 hover:ring-blue-200">
              <SummaryTile
                icon={<CalendarDays className="size-5" />}
                label="Rendez-vous du jour"
                value={todayAppointments?.length ?? 0}
                tone={todayAppointments?.length ? "text-blue-700" : "text-slate-900"}
                hint={
                  nextAppointment
                    ? `Prochain : ${[nextAppointment.time, nextAppointment.title].filter(Boolean).join(" · ")}`
                    : todayAppointments?.length
                      ? "Plus rien de prévu aujourd'hui"
                      : "Rien de prévu aujourd'hui"
                }
              />
            </Link>
            <Link to="/clients" className="block rounded-2xl transition hover:ring-2 hover:ring-blue-200">
              <SummaryTile
                icon={<Users className="size-5" />}
                label="Clients"
                value={dash.counts.clients}
                hint={`${dash.counts.vehicles} véhicule${dash.counts.vehicles > 1 ? "s" : ""} enregistré${dash.counts.vehicles > 1 ? "s" : ""}`}
              />
            </Link>
            <Link to="/devis" className="block rounded-2xl transition hover:ring-2 hover:ring-blue-200">
              <SummaryTile
                icon={<FileText className="size-5" />}
                label="Devis en attente"
                value={dash.quotes.en_attente}
                tone={dash.quotes.en_attente ? "text-amber-600" : "text-slate-900"}
                hint={dash.quotes.en_attente ? "Réponse du client attendue" : "Aucun devis en attente"}
              />
            </Link>
            <Link to="/factures" className="block rounded-2xl transition hover:ring-2 hover:ring-blue-200">
              <SummaryTile
                icon={<Wallet className="size-5" />}
                label="Reste à encaisser"
                value={formatMoney(dash.invoices.toCollect)}
                tone={dash.invoices.toCollect ? "text-red-600" : "text-slate-900"}
                hint={dash.invoices.unpaidCount ? `${dash.invoices.unpaidCount} facture(s) non soldée(s)` : "Tout est encaissé"}
              />
            </Link>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nos services</h2>
            <p className="text-sm text-slate-500">Prestations proposées par le garage · prix indicatifs hors taxes</p>
          </div>
          <Link to="/parametres" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
            Gérer les prestations <ArrowRight className="size-4" />
          </Link>
        </div>
        {templates && templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
            <EmptyState icon={<Sparkles className="size-6" />}>Aucune prestation : ajoutez-les dans Paramètres → Prestations fréquentes.</EmptyState>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...categories].map(([category, services]) => (
              <ServiceCategory key={category} category={category} services={services} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
