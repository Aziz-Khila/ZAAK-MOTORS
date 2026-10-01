import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GarageSettings } from "@garage/shared";

class ApiError extends Error {}

/** Émis quand le serveur refuse une requête parce que le code PIN n'a pas été saisi. */
export const LOCKED_EVENT = "garage:locked";

export interface AuthStatus {
  enabled: boolean;
  unlocked: boolean;
  garageName: string;
}

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: {} };
  if (body instanceof Blob || body instanceof ArrayBuffer) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/octet-stream";
    init.body = body;
  } else if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("Serveur injoignable. Vérifiez que le logiciel est bien démarré sur le PC.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.status === 401 && data?.locked) window.dispatchEvent(new Event(LOCKED_EVENT));
  if (!res.ok) throw new ApiError(data?.message ?? `Erreur ${res.status}`);
  return data as T;
}

/** Lecture d'une ressource ; `path` à null désactive la requête. */
export function useApi<T>(path: string | null, options: { refetchInterval?: number } = {}) {
  return useQuery<T>({
    queryKey: [path],
    queryFn: () => api<T>(path!),
    enabled: path !== null,
    refetchInterval: options.refetchInterval,
  });
}

/** Écriture ; toutes les données sont rafraîchies après succès. */
export function useAction<TVars = void, TResult = unknown>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation<TResult, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useSettings() {
  return useApi<GarageSettings>("/api/settings");
}

export function useAuthStatus() {
  return useApi<AuthStatus>("/api/auth/status");
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== false) q.set(k, String(v === true ? 1 : v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
