import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  Calculator,
  CalendarDays,
  Car,
  ChartNoAxesCombined,
  FileText,
  House,
  Lock,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "@garage/shared";
import { api, useApi, useAuthStatus, useSettings } from "../api";
import { cn, useTrackPreviousPath } from "./ui";

type NavEntry = { to: string; label: string; icon: typeof Wrench; end?: boolean };
type NavMode = "drawer" | "expanded" | "collapsed";

const COLLAPSED_KEY = "sidebar.collapsed";

const NAV_MAIN: NavEntry[] = [
  { to: "/", label: "Accueil", icon: House, end: true },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/vehicules", label: "Véhicules", icon: Car },
  { to: "/devis", label: "Devis", icon: FileText },
  { to: "/factures", label: "Factures", icon: Receipt },
  { to: "/pieces", label: "Pièces", icon: Package },
];

const NAV_ADMIN: NavEntry[] = [
  { to: "/comptabilite", label: "Comptabilité", icon: Calculator },
  { to: "/rentabilite", label: "Rentabilité", icon: ChartNoAxesCombined },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

/** Nombre d'alertes par lien (ex. rappels déclenchés sur l'agenda) : un point rouge s'affiche sur le lien. */
type NavAlerts = Record<string, number>;

function NavGroup({ items, onNavigate, mode, alerts = {} }: { items: NavEntry[]; onNavigate?: () => void; mode: NavMode; alerts?: NavAlerts }) {
  const collapsed = mode === "collapsed";
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon, end }) => {
        const alert = alerts[to] ?? 0;
        const title = alert ? `${label} · ${alert} rappel${alert > 1 ? "s" : ""}` : label;
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={title}
            aria-label={collapsed || alert ? title : undefined}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center rounded-lg font-medium transition-colors",
                mode === "drawer"
                  ? "min-h-11 gap-3 px-3 py-2 text-[15px] leading-tight"
                  : collapsed
                    ? "mx-auto size-11 justify-center"
                    : "min-h-10 gap-3 px-3 py-2 text-sm leading-tight",
                isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className={cn("absolute inset-y-2 w-[3px] rounded-r-full bg-blue-500", collapsed ? "-left-2.5" : "left-0")} />}
                <Icon className={cn("size-5 shrink-0 transition-colors", isActive ? "text-blue-400" : "text-neutral-500 group-hover:text-neutral-200")} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {alert > 0 && <span className={cn("size-2.5 shrink-0 rounded-full bg-red-500", collapsed && "absolute right-2 top-2")} />}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function NavItems({ onNavigate, mode, alerts }: { onNavigate?: () => void; mode: NavMode; alerts?: NavAlerts }) {
  return (
    <div className="flex flex-col gap-4">
      <NavGroup items={NAV_MAIN} onNavigate={onNavigate} mode={mode} alerts={alerts} />
      <div>
        {mode === "collapsed" ? (
          <div className="mx-3 mb-4 border-t border-white/10" />
        ) : (
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Gestion</div>
        )}
        <NavGroup items={NAV_ADMIN} onNavigate={onNavigate} mode={mode} />
      </div>
    </div>
  );
}

function Brand({ name, collapsed }: { name: string; collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      <img src="/logo-star.png" alt={name} className="size-9 shrink-0" />
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-[0.3em] text-white">ZAAK</div>
          <div className="mt-1.5 text-[9px] font-medium tracking-[0.45em] text-neutral-400">MOTORS</div>
        </div>
      )}
    </div>
  );
}

function initialCollapsed() {
  const saved = localStorage.getItem(COLLAPSED_KEY);
  return saved !== null ? saved === "1" : window.innerWidth < 1280;
}

function FooterButton({ icon: Icon, label, collapsed, onClick, expanded }: { icon: typeof Wrench; label: string; collapsed: boolean; onClick: () => void; expanded?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-expanded={expanded}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium text-neutral-500 transition-colors hover:bg-white/10 hover:text-white",
        collapsed ? "mx-auto size-11 justify-center" : "h-10 w-full gap-3 px-3",
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}

export function Layout() {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggleSidebar = () => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
    setCollapsed(!collapsed);
  };
  const { data: settings } = useSettings();
  const { data: auth } = useAuthStatus();
  const qc = useQueryClient();
  const canLock = !!auth?.enabled;
  const lockApp = () => void api("/api/auth/lock", "POST").finally(() => qc.invalidateQueries());
  const location = useLocation();
  useTrackPreviousPath();
  const garageName = settings?.garageName || "Mon garage";
  const { data: reminders } = useApi<Appointment[]>("/api/appointments/reminders", { refetchInterval: 60000 });
  const alerts: NavAlerts = { "/agenda": reminders?.length ?? 0 };

  return (
    <div className="flex h-full">
      {/* Menu latéral : réductible en une colonne d'icônes, préférence mémorisée */}
      <aside className={cn("no-print hidden h-full shrink-0 flex-col bg-black transition-[width] duration-200 md:flex", collapsed ? "w-[72px]" : "w-60")}>
        <div className={cn("flex h-16 shrink-0 items-center border-b border-white/10", collapsed ? "justify-center" : "px-5")}>
          <Brand name={garageName} collapsed={collapsed} />
        </div>
        <div className={cn("no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4", collapsed ? "px-2.5" : "px-3")}>
          <NavItems mode={collapsed ? "collapsed" : "expanded"} alerts={alerts} />
        </div>
        <div className={cn("space-y-1 border-t border-white/10 py-2.5", collapsed ? "px-2.5" : "px-3")}>
          {canLock && <FooterButton icon={Lock} label="Verrouiller" collapsed={collapsed} onClick={lockApp} />}
          <FooterButton
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
            collapsed={collapsed}
            onClick={toggleSidebar}
            expanded={!collapsed}
          />
        </div>
      </aside>

      {drawer && (
        <div className="no-print fixed inset-0 z-50 md:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-black" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 pl-5 pr-3">
              <Brand name={garageName} />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Fermer le menu">
                <X className="size-6" />
              </button>
            </div>
            <div className="flex-1 px-3 py-4">
              <NavItems onNavigate={() => setDrawer(false)} mode="drawer" alerts={alerts} />
            </div>
            {canLock && (
              <div className="border-t border-white/10 px-3 py-2.5">
                <FooterButton icon={Lock} label="Verrouiller" collapsed={false} onClick={lockApp} />
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 shrink-0 items-center gap-3 bg-black px-3 md:hidden">
          <button onClick={() => setDrawer(true)} className="relative rounded-lg p-2 text-neutral-300 hover:bg-white/10 hover:text-white" aria-label="Menu">
            <Menu className="size-6" />
            {alerts["/agenda"] > 0 && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-red-500" />}
          </button>
          <Brand name={garageName} />
        </header>
        <main key={location.pathname} className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
