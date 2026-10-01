import { useState } from "react";
import { useNavigate } from "react-router";
import { Car, ChevronRight, Fuel, Gauge, Phone, Plus, Search, Tag, X } from "lucide-react";
import { fuelLabel, type VehicleListItem } from "@garage/shared";
import { useApi } from "../../api";
import { VehicleFormModal } from "../../components/forms";
import { useShowMore } from "../../components/list";
import { PlateBadge } from "../../components/StatusBadge";
import { SummaryTile } from "../../components/tiles";
import { Button, EmptyState, ErrorBox, PageHeader, Spinner, cn } from "../../components/ui";
import { ClientAvatar } from "../clients/ClientAvatar";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Mercedes GLA », ou vide si la marque et le modèle ne contiennent rien d'utile. */
function vehicleName(v: VehicleListItem) {
  const name = [capitalize(v.brand.trim()), v.model.trim()].filter(Boolean).join(" ");
  return /[\p{L}\p{N}]/u.test(name) ? name : "";
}

function VehicleName({ v }: { v: VehicleListItem }) {
  const name = vehicleName(v);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {name ? <span className="font-semibold text-slate-900 group-hover:text-blue-700">{name}</span> : <span className="italic text-slate-400">Non renseigné</span>}
      {v.year && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{v.year}</span>}
    </div>
  );
}

const km = (v: VehicleListItem) => (v.mileage ? `${v.mileage.toLocaleString("fr-FR")} km` : "—");

const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-5";
const td = "px-4 py-3.5 first:pl-5";

export function VehiclesPage() {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { data, isLoading, error } = useApi<VehicleListItem[]>(`/api/vehicles?q=${encodeURIComponent(q)}`);
  const open = (v: VehicleListItem) => navigate(`/vehicules/${v.id}`);

  const list = data ?? [];
  const brandCounts = new Map<string, number>();
  for (const v of list) {
    const b = capitalize(v.brand.trim());
    if (b) brandCounts.set(b, (brandCounts.get(b) ?? 0) + 1);
  }
  const topBrand = [...brandCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const withMileage = list.filter((v) => v.mileage);
  const avgMileage = withMileage.length ? Math.round(withMileage.reduce((s, v) => s + (v.mileage ?? 0), 0) / withMileage.length) : 0;
  const { visible, more } = useShowMore(list);

  return (
    <>
      <PageHeader
        title="Véhicules"
        subtitle="Parc des véhicules clients, kilométrage et propriétaires"
        actions={
          <Button icon={<Plus className="size-5" />} onClick={() => setCreating(true)}>
            Nouveau véhicule
          </Button>
        }
      />

      {data && !q && list.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryTile icon={<Car className="size-5" />} label="Véhicules" value={list.length} hint={`${new Set(list.map((v) => v.clientId)).size} propriétaire(s)`} />
          <SummaryTile
            icon={<Tag className="size-5" />}
            label="Marque principale"
            value={topBrand ? topBrand[0] : "—"}
            hint={topBrand ? `${topBrand[1]} véhicule(s) sur ${list.length}` : undefined}
          />
          <SummaryTile
            icon={<Gauge className="size-5" />}
            label="Kilométrage moyen"
            value={avgMileage ? `${avgMileage.toLocaleString("fr-FR")} km` : "—"}
            hint={withMileage.length ? `Sur ${withMileage.length} véhicule(s) renseigné(s)` : undefined}
          />
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par plaque, marque, modèle ou client…"
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {q && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {data && (
            <span className="px-2 text-sm text-slate-500">
              {list.length} véhicule{list.length > 1 ? "s" : ""}
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
          <EmptyState icon={<Car className="size-10 text-slate-300" />}>
            {q ? (
              <>Aucun véhicule ne correspond à « {q} »</>
            ) : (
              <div className="space-y-3">
                <div>Aucun véhicule enregistré</div>
                <Button icon={<Plus className="size-5" />} onClick={() => setCreating(true)}>
                  Ajouter un véhicule
                </Button>
              </div>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className={th}>Véhicule</th>
                    <th className={th}>Immatriculation</th>
                    <th className={cn(th, "text-right")}>Kilométrage</th>
                    <th className={th}>Propriétaire</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((v) => (
                    <tr key={v.id} onClick={() => open(v)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <Car className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <VehicleName v={v} />
                            <div className="text-xs text-slate-500">{fuelLabel(v.fuel) || "Carburant non renseigné"}</div>
                          </div>
                        </div>
                      </td>
                      <td className={td}>
                        <PlateBadge plate={v.plate} />
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-right tabular-nums text-slate-700")}>{km(v)}</td>
                      <td className={td}>
                        <div className="flex items-center gap-2.5">
                          <ClientAvatar name={v.clientName} type="particulier" size="sm" />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800">{v.clientName}</div>
                            {v.clientPhone && <div className="text-xs tabular-nums text-slate-500">{v.clientPhone}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="pr-4">
                        <ChevronRight className="size-5 text-slate-300 transition-colors group-hover:text-slate-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {visible.map((v) => (
                <button key={v.id} type="button" onClick={() => open(v)} className="group flex w-full items-center gap-3 p-4 text-left transition active:bg-slate-50">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlateBadge plate={v.plate} />
                      <VehicleName v={v} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <ClientAvatar name={v.clientName} type="particulier" size="sm" /> {v.clientName}
                      </span>
                      {v.clientPhone && (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Phone className="size-4 text-slate-400" /> {v.clientPhone}
                        </span>
                      )}
                      {v.mileage && (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Gauge className="size-4 text-slate-400" /> {km(v)}
                        </span>
                      )}
                      {v.fuel && (
                        <span className="inline-flex items-center gap-1.5">
                          <Fuel className="size-4 text-slate-400" /> {fuelLabel(v.fuel)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
            {more}
          </>
        )}
      </section>

      <VehicleFormModal open={creating} onClose={() => setCreating(false)} onSaved={(v) => navigate(`/vehicules/${v.id}`)} />
    </>
  );
}
