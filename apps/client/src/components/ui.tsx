import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowLeft, Loader2, X } from "lucide-react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------- Boutons ----------
type Variant = "primary" | "secondary" | "danger" | "ghost" | "success" | "warning";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm",
  secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm",
  warning: "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm",
  ghost: "text-slate-700 hover:bg-slate-200/70",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  const sizes = { sm: "h-9 px-3 text-sm gap-1.5", md: "h-11 px-4 text-base gap-2", lg: "h-14 px-6 text-lg gap-2.5" };
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  target,
}: {
  to: string;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  target?: string;
}) {
  const sizes = { sm: "h-9 px-3 text-sm gap-1.5", md: "h-11 px-4 text-base gap-2", lg: "h-14 px-6 text-lg gap-2.5" };
  return (
    <Link
      to={to}
      target={target}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-colors",
        sizes[size],
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

// ---------- Champs ----------
const fieldBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(fieldBase, "py-2.5", className)} {...props} />;
  },
);

export function Select({
  options,
  className,
  placeholder,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select className={cn(fieldBase, "h-11 pr-8", className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Field({
  label,
  children,
  hint,
  required,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
      aria-pressed={checked}
    >
      <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-slate-300")}>
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
      <span className="font-medium text-slate-800">{label}</span>
    </button>
  );
}

// ---------- Mise en page ----------
export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Page(s) parente(s) de chaque écran ; la première est celle par défaut. Les pages du menu n'ont pas de retour. */
const BACK_TO: [RegExp, string[]][] = [
  [/^\/clients\/[^/]+$/, ["/clients"]],
  [/^\/vehicules\/[^/]+$/, ["/vehicules"]],
  [/^\/devis\/[^/]+$/, ["/devis"]],
  [/^\/factures\/[^/]+$/, ["/factures"]],
];

let currentPath: string | null = null;
let previousPath: string | null = null;

/** Mémorise la page précédente de l'application (à appeler une fois, dans le Layout). */
export function useTrackPreviousPath() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === currentPath) return;
    previousPath = currentPath;
    currentPath = pathname;
  }, [pathname]);
}

/** Remonte à la page parente de la même rubrique (ex. fiche client → liste des clients). */
function BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const parents = BACK_TO.find(([re]) => re.test(pathname))?.[1];
  if (!parents) return null;
  const goBack = () => {
    const parent = parents.find((p) => p === previousPath) ?? parents[0];
    if (parent === previousPath) return navigate(-1);
    navigate(parent);
  };
  return (
    <button
      type="button"
      onClick={goBack}
      title="Retour"
      aria-label="Retour"
      className="no-print flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 pb-5">
      <div className="flex min-w-0 items-center gap-3">
        <BackButton />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem] md:leading-tight">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-slate-500 md:text-base">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  gray: "bg-gray-100 text-gray-600 ring-gray-200",
  violet: "bg-violet-100 text-violet-800 ring-violet-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  cyan: "bg-cyan-100 text-cyan-800 ring-cyan-200",
  blue: "bg-blue-100 text-blue-800 ring-blue-200",
  orange: "bg-orange-100 text-orange-800 ring-orange-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  red: "bg-red-100 text-red-800 ring-red-200",
};

export function Badge({ color = "slate", children, className }: { color?: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset",
        BADGE_COLORS[color] ?? BADGE_COLORS.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}

export const DOT_COLORS: Record<string, string> = {
  slate: "bg-slate-400",
  gray: "bg-gray-400",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
};

/** Modales ouvertes, de la plus ancienne à la plus récente : Échap ne ferme que celle du dessus. */
const openModals: symbol[] = [];

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = Symbol();
    openModals.push(id);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openModals.at(-1) === id && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      openModals.splice(openModals.indexOf(id), 1);
    };
  }, [open]);
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={cn("flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", widths[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Spinner({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <Loader2 className="size-6 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
      {icon}
      <div>{children}</div>
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
      {error instanceof Error ? error.message : "Une erreur est survenue."}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "h-10 whitespace-nowrap rounded-lg px-4 font-semibold transition",
            value === t.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm md:text-base">{children}</table>
    </div>
  );
}

export const th = "whitespace-nowrap border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500";
export const td = "border-b border-slate-100 px-3 py-2.5 align-middle";

export function ConfirmButton({
  onConfirm,
  message,
  children,
  ...props
}: ButtonProps & { onConfirm: () => void; message: string }) {
  return (
    <Button
      aria-label={children ? undefined : (props.title ?? message)}
      {...props}
      onClick={() => window.confirm(message) && onConfirm()}
    >
      {children}
    </Button>
  );
}
