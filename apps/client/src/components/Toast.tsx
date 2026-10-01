import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string | unknown) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, kind, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m instanceof Error ? m.message : String(m)),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${
              t.kind === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="Fermer">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider manquant");
  return ctx;
}
