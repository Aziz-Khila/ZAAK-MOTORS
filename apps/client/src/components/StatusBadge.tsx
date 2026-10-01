import { invoiceStatusColor, invoiceStatusLabel, quoteStatusColor, quoteStatusLabel } from "@garage/shared";
import { Badge } from "./ui";

export function QuoteStatusBadge({ status }: { status: string }) {
  return <Badge color={quoteStatusColor(status)}>{quoteStatusLabel(status)}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  return <Badge color={invoiceStatusColor(status)}>{invoiceStatusLabel(status)}</Badge>;
}

export function PlateBadge({ plate, large }: { plate: string; large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border-2 border-slate-800 bg-white font-mono font-bold tracking-wider text-slate-900 ${
        large ? "px-3 py-1 text-xl" : "px-2 py-0.5 text-sm"
      }`}
    >
      {plate || "—"}
    </span>
  );
}
