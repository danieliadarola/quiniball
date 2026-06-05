"use client";

import { useState } from "react";

/** Muestra el código y el enlace de invitación con botones de copiar. */
export function ShareCode({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState<"code" | "url" | null>(null);

  async function copy(value: string, which: "code" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard no disponible: el usuario puede copiar a mano */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface2 px-4 py-3">
        <span className="font-display text-2xl tracking-[0.3em] text-accent">{code}</span>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-accent/60 hover:text-accent"
        >
          {copied === "code" ? "¡Copiado!" : "Copiar código"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => copy(url, "url")}
        className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-accent/60 hover:text-accent"
      >
        {copied === "url" ? "¡Enlace copiado!" : "Copiar enlace de invitación"}
      </button>
    </div>
  );
}
