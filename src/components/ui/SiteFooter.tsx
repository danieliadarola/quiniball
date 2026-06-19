import Link from "next/link";
import { APP_NAME, APP_VERSION } from "@/config/defaults";

/**
 * Pie de página común de la app: enlace a la política de privacidad (requisito
 * de tienda y buena práctica) y aviso de copyright con el año en curso.
 * Texto pequeño y discreto, pensado para ir al final del contenido.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto w-full max-w-3xl px-5 pb-8 pt-6 text-center safe-px [--pad-x:1.25rem] safe-pb [--pad-b:2rem]">
      <p className="text-[11px] leading-relaxed text-muted2">
        <Link
          href="/privacidad"
          className="font-semibold text-muted transition hover:text-primary hover:underline"
        >
          Política de privacidad
        </Link>
        <span className="mx-2 text-line2" aria-hidden>
          ·
        </span>
        © {year} {APP_NAME}. Todos los derechos reservados.
        <span className="mx-2 text-line2" aria-hidden>
          ·
        </span>
        v{APP_VERSION}
      </p>
    </footer>
  );
}
