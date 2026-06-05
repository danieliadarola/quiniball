/**
 * Campo de formulario reutilizable (label + input) con estilo QuiniBall.
 */
import type { InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  hint?: string;
}

export function AuthField({ label, name, hint, ...props }: AuthFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.6px] text-muted">{label}</span>
      <input
        name={name}
        className="w-full rounded-xl border border-line2 bg-surface2 px-4 py-3.5 text-base font-semibold text-fg outline-none transition placeholder:font-medium placeholder:text-muted2 focus:border-primary"
        {...props}
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
