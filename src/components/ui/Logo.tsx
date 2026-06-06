/**
 * Marca QuiniBall (temática Mundial 2026).
 *  - <Logo>: icono circular (la insignia del balón) + wordmark "QuiniBall".
 *    Pensado para cabeceras; a tamaño pequeño el lema de la insignia no se lee,
 *    por eso el nombre va como texto al lado.
 *  - <LogoBadge>: la insignia completa en grande (ya incluye nombre y lema),
 *    para portada y login.
 */
import Image from "next/image";

export function Logo({
  size = 30,
  mono = false,
  className = "",
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-white/15"
        style={{ width: size, height: size }}
      >
        <Image
          src="/quiniball-badge.jpg"
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="font-display text-[22px] font-bold italic uppercase tracking-[0.4px]">
        Quini
        <b className={`font-extrabold ${mono ? "" : "text-[#1f9d4d]"}`}>Ball</b>
      </span>
    </div>
  );
}

/** Insignia completa (con nombre y lema incrustados) para portada/login. */
export function LogoBadge({
  size = 150,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/quiniball-badge.jpg"
      alt="QuiniBall — juega con el Mundial 2026"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full object-cover shadow-2xl shadow-black/50 ring-1 ring-white/10 ${className}`}
    />
  );
}
