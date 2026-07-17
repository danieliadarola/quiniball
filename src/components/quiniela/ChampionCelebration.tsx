"use client";

/**
 * Reconocimiento al CAMPEÓN de la quiniela (solo cuando el Mundial ha terminado).
 *
 *  · `ChampionBanner`: cinta dorada permanente en la pestaña de Ranking con el/los
 *    ganador(es). Co-campeones si hubo empate a puntos.
 *  · `ChampionModal`: celebración de una sola vez POR DISPOSITIVO y quiniela
 *    (localStorage). Enhorabuena si eres tú; resultado final si no.
 *
 * Ambos son puramente presentacionales: reciben la lista de campeones ya
 * calculada por la vista `standings` (`is_champion`).
 */
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { StandingRow } from "@/lib/standings/fetch";

/** Une nombres con comas y una "y" final: ["A","B","C"] -> "A, B y C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

// -----------------------------------------------------------------------------

export function ChampionBanner({
  champions,
  currentProfileId,
}: {
  champions: StandingRow[];
  currentProfileId: string;
}) {
  if (champions.length === 0) return null;
  const iWon = champions.some((c) => c.profileId === currentProfileId);
  const multi = champions.length > 1;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#f5c542]/45 bg-gradient-to-br from-[#f7cf52]/18 via-surface to-surface px-4 py-3.5">
      <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-[#f5c542]/15 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f7cf52] to-[#e0a020] text-[#5a3d00] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <TrophyGlyph />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[1px] text-[#e0a020]">
            {multi ? "Campeones del Mundial" : "Campeón del Mundial"}
          </p>
          <p className="truncate font-display text-[17px] font-extrabold leading-tight text-fg">
            {joinNames(champions.map((c) => c.displayName))}
            {iWon && <span className="ml-1.5 text-[12px] font-extrabold text-accent">· ¡Eres tú!</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

const MODAL_KEY_PREFIX = "qb_champion_";

export function ChampionModal({
  groupId,
  groupName,
  champions,
  currentProfileId,
  myRank,
  myPoints,
}: {
  groupId: string;
  groupName: string;
  champions: StandingRow[];
  currentProfileId: string;
  myRank: number | null;
  myPoints: number;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (champions.length === 0) return;
    try {
      if (localStorage.getItem(MODAL_KEY_PREFIX + groupId) !== "seen") setShow(true);
    } catch {
      /* localStorage no disponible (modo privado): no se muestra */
    }
  }, [champions.length, groupId]);

  function close() {
    try {
      localStorage.setItem(MODAL_KEY_PREFIX + groupId, "seen");
    } catch {
      /* sin persistencia: se ignora */
    }
    setShow(false);
  }

  if (!show || champions.length === 0) return null;
  const iWon = champions.some((c) => c.profileId === currentProfileId);
  const multi = champions.length > 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Fin del Mundial"
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-t-3xl border border-line bg-surface p-6 text-center safe-pb sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resplandor dorado superior */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-40 rounded-full bg-[#f5c542]/25 blur-3xl" />

        <div className="relative">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-b from-[#f7cf52] to-[#d99516] text-[#5a3d00] shadow-[inset_0_2px_0_rgba(255,255,255,0.55),0_10px_30px_rgba(224,160,32,0.35)]">
            <TrophyGlyph size={40} />
          </span>

          <p className="mt-4 text-[11.5px] font-extrabold uppercase tracking-[2px] text-[#e0a020]">
            El Mundial ha terminado
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-wide text-fg">
            {iWon ? "¡Campeón!" : multi ? "Campeones" : "Campeón"}
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-muted">{groupName}</p>

          {/* Ganador(es) */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {champions.map((c) => (
              <div key={c.profileId} className="flex flex-col items-center gap-1.5">
                <Avatar
                  id={c.profileId}
                  name={c.displayName}
                  size={54}
                  ringClass="ring-2 ring-[#f5c542] ring-offset-2 ring-offset-surface"
                  avatarStyle={c.avatarStyle}
                  avatarSeed={c.avatarSeed}
                />
                <span className="max-w-[92px] truncate text-[12.5px] font-bold text-fg">
                  {c.displayName}
                </span>
                <span className="text-[11px] font-bold text-muted">{c.totalPoints} pts</span>
              </div>
            ))}
          </div>

          <p className="mt-5 rounded-xl bg-surface2 px-4 py-3 text-[13px] leading-snug text-muted">
            {iWon ? (
              <>
                Enhorabuena, has ganado la quiniela con{" "}
                <b className="text-fg">{myPoints} pts</b>. ¡Disfruta la corona! 👑
              </>
            ) : (
              <>
                Terminaste en la posición <b className="text-fg">#{myRank ?? "—"}</b> con{" "}
                <b className="text-fg">{myPoints} pts</b>. ¡Gracias por jugar!
              </>
            )}
          </p>

          <button
            type="button"
            onClick={close}
            className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong"
          >
            {iWon ? "¡Gracias!" : "Ver clasificación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

/** Trofeo macizo (relleno, hereda el color del texto). */
function TrophyGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M6 4h12v3a6 6 0 0 1-4 5.66V15h1.2a2 2 0 0 1 2 2v.5H6.8V17a2 2 0 0 1 2-2H10v-2.34A6 6 0 0 1 6 7V4z" />
      <path d="M6 4H3.5v2A3.5 3.5 0 0 0 6.6 9.48 8 8 0 0 1 6 7.2zM18 4h2.5v2A3.5 3.5 0 0 1 17.4 9.48 8 8 0 0 0 18 7.2z" />
      <path d="M7.5 19.5h9V21a.5.5 0 0 1-.5.5H8a.5.5 0 0 1-.5-.5z" />
    </svg>
  );
}
