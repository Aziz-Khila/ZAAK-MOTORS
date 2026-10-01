import { cn } from "../../components/ui";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : (words[0]?.[1] ?? ""))).toUpperCase() || "?";
}

const AVATAR_SIZES = { sm: "size-7 text-[11px]", md: "size-10 text-sm", lg: "size-14 text-lg" };

export function ClientAvatar({ name, type, size = "md" }: { name: string; type: string; size?: keyof typeof AVATAR_SIZES }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ring-1 ring-inset",
        AVATAR_SIZES[size],
        type === "societe" ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ClientTypeTag({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        type === "societe" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600",
      )}
    >
      {type === "societe" ? "Société" : "Particulier"}
    </span>
  );
}
