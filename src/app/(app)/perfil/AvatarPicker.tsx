"use client";

/**
 * Selector de avatar: el usuario elige un ESTILO (DiceBear) y una variante
 * (semilla). Vista previa grande, fila de estilos y rejilla de variantes; el
 * SVG de cada opción lo sirve nuestra ruta /api/avatar (cacheada). Guarda
 * `style` + `seed`, o lo quita para volver a la inicial.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAvatar } from "./actions";
import {
  AVATAR_STYLES,
  DEFAULT_AVATAR_STYLE,
  avatarUrl,
  hasAvatar,
} from "@/lib/avatar/styles";

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeGrid(first?: string | null): string[] {
  const seeds: string[] = [];
  if (first) seeds.push(first);
  while (seeds.length < 8) {
    const s = randomSeed();
    if (!seeds.includes(s)) seeds.push(s);
  }
  return seeds;
}

export function AvatarPicker({
  currentStyle,
  currentSeed,
  name,
}: {
  currentStyle: string | null;
  currentSeed: string | null;
  name: string;
}) {
  const router = useRouter();
  const startWithAvatar = hasAvatar(currentStyle, currentSeed);

  const [style, setStyle] = useState(currentStyle ?? DEFAULT_AVATAR_STYLE);
  const [seed, setSeed] = useState(currentSeed ?? randomSeed());
  const [grid, setGrid] = useState<string[]>(() => makeGrid(currentSeed ?? seed));
  const [saving, startSave] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save(nextStyle: string | null, nextSeed: string | null) {
    setMsg(null);
    startSave(async () => {
      const r = await updateAvatar(nextStyle, nextSeed);
      if (r.error) setMsg(r.error);
      else {
        setMsg(nextStyle === null ? "Avatar quitado ✓" : "Avatar guardado ✓");
        router.refresh();
      }
    });
  }

  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">Tu avatar</h2>

      {/* Vista previa */}
      <div className="flex items-center gap-4">
        <img
          src={avatarUrl(style, seed)}
          alt="Vista previa del avatar"
          width={76}
          height={76}
          className="h-[76px] w-[76px] shrink-0 rounded-full bg-surface3 ring-2 ring-primary/40"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-fg">{name || "Tú"}</p>
          <p className="text-xs text-muted">Así te verán en los rankings.</p>
        </div>
      </div>

      {/* Estilos */}
      <div>
        <span className="mb-1.5 block text-[12.5px] font-extrabold text-fg">Estilo</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {AVATAR_STYLES.map((s) => {
            const active = s.key === style;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStyle(s.key)}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-2.5 py-2 transition ${
                  active ? "border-primary bg-primary/10" : "border-line bg-surface2 hover:border-primary/50"
                }`}
              >
                <img
                  src={avatarUrl(s.key, seed)}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full bg-surface3"
                />
                <span className={`text-[10.5px] font-bold ${active ? "text-primary" : "text-muted"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Variantes */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12.5px] font-extrabold text-fg">Elige uno</span>
          <button
            type="button"
            onClick={() => setGrid(makeGrid())}
            className="text-[12px] font-bold text-primary hover:underline"
          >
            🎲 Más opciones
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {grid.map((s) => {
            const active = s === seed;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeed(s)}
                className={`rounded-xl border p-1 transition ${
                  active ? "border-primary ring-2 ring-primary/40" : "border-line hover:border-primary/50"
                }`}
              >
                <img
                  src={avatarUrl(style, s)}
                  alt=""
                  width={56}
                  height={56}
                  className="aspect-square w-full rounded-lg bg-surface3"
                />
              </button>
            );
          })}
        </div>
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.includes("✓") ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
          {msg}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={saving}
          onClick={() => save(style, seed)}
          className="flex-1 rounded-xl bg-primary px-5 py-3 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar avatar"}
        </button>
        {startWithAvatar && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(null, null)}
            title="Volver a la inicial"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line2 bg-surface2 text-base font-extrabold text-muted transition hover:border-bad/60 hover:text-bad disabled:opacity-50"
          >
            {initial}
          </button>
        )}
      </div>
    </div>
  );
}
