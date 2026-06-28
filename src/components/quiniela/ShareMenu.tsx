"use client";

/**
 * Botón "Compartir" de la quiniela (cabecera) + hoja inferior con las opciones:
 * mi posición, ranking del grupo, resumen de la jornada e invitación.
 *
 * Comparte SOLO texto + enlace (lo más robusto en la app Android/WebView y en
 * navegador): usa la Web Share API si existe (deja elegir WhatsApp y demás) y,
 * si no, abre WhatsApp con wa.me; como último recurso copia el mensaje.
 *
 * Los enlaces apuntan al enlace de invitación: quien lo abra entra a la quiniela
 * (los miembros la abren; los nuevos se unen) → además de picarse, suma gente.
 */
import { useState } from "react";

export interface ShareStanding {
  displayName: string;
  totalPoints: number;
}
export interface JornadaSummary {
  name: string;
  points: number;
  aciertos: number;
  total: number;
}

async function shareText(text: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return; // el usuario canceló
    }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(wa, "_blank", "noopener,noreferrer");
  if (!win) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Mensaje copiado: pégalo en WhatsApp.");
    } catch {
      /* sin portapapeles: no hay más que hacer */
    }
  }
}

export function ShareMenu({
  groupName,
  inviteUrl,
  myRank,
  myPoints,
  standings,
  jornada,
}: {
  groupName: string;
  inviteUrl: string;
  myRank: number | null;
  myPoints: number;
  standings: ShareStanding[];
  jornada: JornadaSummary | null;
}) {
  const [open, setOpen] = useState(false);

  const positionMsg = () => {
    const pos = myRank ? `Voy ${myRank}º` : "Estoy jugando";
    return `🏆 ${pos} con ${myPoints} pts en «${groupName}» (QuiniBall).\n¿Te atreves a alcanzarme? 👇\n${inviteUrl}`;
  };
  const rankingMsg = () => {
    const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`);
    const top = standings
      .slice(0, 5)
      .map((s, i) => `${medal(i)} ${s.displayName} — ${s.totalPoints} pts`)
      .join("\n");
    return `📊 Ranking de «${groupName}» (QuiniBall):\n${top}\n\n¿Te unes? 👇\n${inviteUrl}`;
  };
  const jornadaMsg = () => {
    if (!jornada) return "";
    const head = myRank ? `Voy ${myRank}º. ` : "";
    return `⚽ ${jornada.name} en «${groupName}»:\nHe hecho ${jornada.points} pts (${jornada.aciertos}/${jornada.total} aciertos) 🎯\n${head}${inviteUrl}`;
  };
  const inviteMsg = () =>
    `⚽ Te invito a mi quiniela del Mundial «${groupName}» en QuiniBall.\nEntra y pronostica los partidos: 👇\n${inviteUrl}`;

  function pick(build: () => string) {
    const text = build();
    if (text) void shareText(text);
    setOpen(false);
  }

  const options: { icon: string; label: string; desc: string; build: () => string }[] = [
    { icon: "🏆", label: "Mi posición", desc: "Tu puesto y tus puntos", build: positionMsg },
    { icon: "📊", label: "Ranking del grupo", desc: "La clasificación actual", build: rankingMsg },
    ...(jornada
      ? [{ icon: "⚽", label: "Resumen de jornada", desc: jornada.name, build: jornadaMsg }]
      : []),
    { icon: "🔗", label: "Invitar al grupo", desc: "Enlace y código para unirse", build: inviteMsg },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compartir"
        title="Compartir"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:border-primary/60 hover:text-fg"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" className="qb-stroke" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-5"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Compartir"
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-line bg-surface p-5 safe-pb sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-col items-center gap-1 text-center">
              <span className="text-2xl" aria-hidden>
                📣
              </span>
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide text-fg">
                Compartir
              </h2>
              <p className="text-[12px] font-semibold text-muted">Manda esto al grupo de WhatsApp</p>
            </div>

            <ul className="flex flex-col gap-2.5">
              {options.map((o) => (
                <li key={o.label}>
                  <button
                    type="button"
                    onClick={() => pick(o.build)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface2 px-3.5 py-3 text-left transition hover:border-primary/60"
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {o.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-fg">{o.label}</p>
                      <p className="truncate text-[12px] text-muted">{o.desc}</p>
                    </div>
                    <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke shrink-0 text-muted" aria-hidden>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-line2 bg-surface2 px-5 py-3 font-semibold text-fg transition hover:border-primary/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
