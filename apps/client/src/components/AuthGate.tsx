import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react";
import { LOCKED_EVENT, api, useAuthStatus } from "../api";

/** Affiche l'écran de code PIN tant que l'appareil n'est pas déverrouillé (si un code est défini). */
export function AuthGate({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useAuthStatus();

  useEffect(() => {
    const onLocked = () => void refetch();
    window.addEventListener(LOCKED_EVENT, onLocked);
    return () => window.removeEventListener(LOCKED_EVENT, onLocked);
  }, [refetch]);

  if (isLoading) return null;
  if (data?.enabled && !data.unlocked) return <LockScreen garageName={data.garageName} onUnlocked={() => qc.invalidateQueries()} />;
  return children;
}

function LockScreen({ garageName, onUnlocked }: { garageName: string; onUnlocked: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!pin || pending) return;
    setPending(true);
    setError("");
    try {
      await api("/api/auth/unlock", "POST", { pin });
      onUnlocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect");
      setPin("");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-black p-6">
      <form
        className="w-full max-w-sm text-center"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <img src="/logo-star.png" alt="" className="mx-auto size-20" />
        <h1 className="mt-5 text-2xl font-bold tracking-wide text-white">{garageName || "Gestion garage"}</h1>
        <p className="mt-1.5 text-sm text-neutral-400">Saisissez le code pour ouvrir le logiciel</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          aria-label="Code PIN"
          placeholder="••••"
          className="mt-8 h-14 w-full rounded-xl border border-white/15 bg-white/5 text-center text-2xl tracking-[0.5em] text-white placeholder:text-neutral-600 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <div className="mt-2 h-5 text-sm text-red-400" role="alert">
          {error}
        </div>
        <button
          type="submit"
          disabled={!pin || pending}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
          Déverrouiller
        </button>
      </form>
    </div>
  );
}
