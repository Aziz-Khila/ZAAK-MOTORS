import { useEffect, useRef, useState } from "react";
import { moneyToInput, normalizePlate, parseDecimal, parseMoney } from "@garage/shared";
import { cn, Input } from "./ui";

/** Saisie d'un montant en dinars (stocké en millimes). */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = "0",
  autoFocus,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (millimes: number | null) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState(moneyToInput(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(moneyToInput(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Input
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="pr-10 text-right tabular-nums"
        onFocus={(e) => {
          focused.current = true;
          e.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          setText(moneyToInput(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseMoney(e.target.value));
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">DT</span>
    </div>
  );
}

/** Saisie d'un nombre décimal (quantités, heures) acceptant la virgule. */
export function DecimalInput({
  value,
  onChange,
  className,
  placeholder,
  suffix,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  className?: string;
  placeholder?: string;
  suffix?: string;
  disabled?: boolean;
}) {
  const toText = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));
  const [text, setText] = useState(toText(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(toText(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Input
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("text-right tabular-nums", suffix && "pr-9")}
        onFocus={(e) => {
          focused.current = true;
          e.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          setText(toText(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseDecimal(e.target.value));
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>
      )}
    </div>
  );
}

const TU_PLATE = /^(\d{0,3})TU(\d{0,4})$/;

function splitTuPlate(plate: string): [string, string] | null {
  const m = normalizePlate(plate).match(TU_PLATE);
  return m ? [m[1], m[2]] : null;
}

/** Plaque tunisienne commencée mais dont une des deux parties est vide (ex. « 123 TU »). */
export function isIncompleteTuPlate(plate: string): boolean {
  const p = splitTuPlate(plate);
  return !!p && (!p[0] || !p[1]);
}

/** Immatriculation : format tunisien « 123 TU 4567 » par défaut, texte libre pour les autres plaques. */
export function PlateInput({
  value,
  onChange,
  large,
  autoFocus,
}: {
  value: string;
  onChange: (plate: string) => void;
  large?: boolean;
  autoFocus?: boolean;
}) {
  const parts = value ? splitTuPlate(value) : ["", ""];
  const [free, setFree] = useState(!parts);
  const rightRef = useRef<HTMLInputElement>(null);
  const leftRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value && !splitTuPlate(value)) setFree(true);
  }, [value]);

  const emit = (left: string, right: string) => onChange(left || right ? `${left} TU ${right}`.trim() : "");
  const size = large ? "h-16 text-3xl" : "h-11 text-lg";
  const digitsClass = cn("min-w-0 flex-1 bg-transparent text-center font-mono font-bold tracking-widest outline-none", size);

  const toggle = (
    <button
      type="button"
      className="mt-1.5 text-sm font-semibold text-blue-600 hover:underline"
      onClick={() => {
        if (free) {
          const p = splitTuPlate(value);
          onChange(p ? `${p[0]} TU ${p[1]}`.trim() : "");
          setFree(false);
        } else setFree(true);
      }}
    >
      {free ? "Revenir au format tunisien (123 TU 4567)" : "Autre format (texte libre)"}
    </button>
  );

  if (free || !parts) {
    return (
      <div>
        <Input
          value={value}
          autoFocus={autoFocus}
          placeholder="Ex. 12345 RS, plaque étrangère…"
          className={cn("text-center font-mono font-bold uppercase tracking-widest", size)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        {toggle}
      </div>
    );
  }

  const [left, right] = parts;
  return (
    <div>
      <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-slate-800 bg-white focus-within:ring-2 focus-within:ring-blue-500/40">
        <input
          ref={leftRef}
          value={left}
          inputMode="numeric"
          autoFocus={autoFocus}
          placeholder="123"
          aria-label="Numéro de série (3 chiffres)"
          className={digitsClass}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
            emit(digits, right);
            if (digits.length === 3) rightRef.current?.focus();
          }}
        />
        <span className={cn("flex shrink-0 items-center bg-slate-800 px-3 font-bold text-white", large ? "text-2xl" : "text-base")}>TU</span>
        <input
          ref={rightRef}
          value={right}
          inputMode="numeric"
          placeholder="4567"
          aria-label="Numéro d'immatriculation (4 chiffres)"
          className={digitsClass}
          onChange={(e) => emit(left, e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !right) leftRef.current?.focus();
          }}
        />
      </div>
      {toggle}
    </div>
  );
}

/** Nombre entier (kilométrage, année). */
export function IntInput({
  value,
  onChange,
  className,
  placeholder,
  suffix,
  maxDigits,
  grouping = true,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  className?: string;
  placeholder?: string;
  suffix?: string;
  maxDigits?: number;
  /** Séparateur de milliers (« 12 500 ») ; à désactiver pour une année. */
  grouping?: boolean;
}) {
  const display =
    value === null || value === undefined
      ? ""
      : grouping
        ? value.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")
        : String(value);
  return (
    <div className={cn("relative", className)}>
      <Input
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        className={cn("tabular-nums", suffix && "pr-12")}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
          onChange(digits ? Number(digits) : null);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>
      )}
    </div>
  );
}
