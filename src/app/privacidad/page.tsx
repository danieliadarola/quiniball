import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/config/defaults";

/**
 * Política de privacidad pública de QuiniBall.
 *
 * URL obligatoria para publicar en Google Play (y buena práctica web). Se sirve
 * con el layout raíz, sin sesión, para que sea accesible por cualquiera y
 * enlazable desde la ficha de la tienda. Texto honesto con lo que la app trata
 * de verdad: identificación (nombre + correo + PIN cifrado) y datos de juego.
 * No hay dinero, ni publicidad, ni rastreadores de terceros.
 */
export const metadata: Metadata = {
  title: `Política de privacidad · ${APP_NAME}`,
  description: `Cómo trata ${APP_NAME} tus datos: qué se recoge, para qué y tus derechos.`,
};

// Contacto de privacidad que se muestra públicamente. Cámbialo si prefieres
// otro correo distinto al de la cuenta de administración.
const CONTACT_EMAIL = "danieliadarola@gmail.com";
const LAST_UPDATED = "8 de junio de 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-fg">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-muted">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-5 py-10 safe-px [--pad-x:1.25rem] safe-pb [--pad-b:2.5rem] sm:py-14">
      <header className="flex flex-col gap-3">
        <Link href="/" className="w-fit text-sm font-semibold text-primary hover:underline">
          ← Volver a {APP_NAME}
        </Link>
        <h1 className="font-display text-4xl font-extrabold italic uppercase leading-[0.95] tracking-wide text-fg sm:text-5xl">
          Política de privacidad
        </h1>
        <p className="text-sm text-muted">Última actualización: {LAST_UPDATED}</p>
      </header>

      <p className="text-lg text-muted">
        {APP_NAME} es una app de quinielas del Mundial 2026 para jugar con amigos y compañeros.{" "}
        <span className="font-semibold text-fg">
          No se mueve dinero: solo puntos y ranking.
        </span>{" "}
        Esta política explica qué datos tratamos, para qué y qué puedes hacer con ellos.
      </p>

      <div className="flex flex-col gap-9">
        <Section title="Quién es responsable">
          <p>
            El responsable del tratamiento es la persona que opera {APP_NAME}. Para cualquier
            asunto de privacidad puedes escribir a{" "}
            <a className="font-semibold text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Qué datos recogemos">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <span className="font-semibold text-fg">Identificación:</span> tu nombre o alias y tu
              correo electrónico.
            </li>
            <li>
              <span className="font-semibold text-fg">Acceso:</span> un PIN que eliges. Se guarda
              siempre <span className="font-semibold text-fg">cifrado</span> (hash), nunca en claro.
            </li>
            <li>
              <span className="font-semibold text-fg">Datos de juego:</span> tus pronósticos, los
              puntos obtenidos y los grupos a los que perteneces.
            </li>
          </ul>
          <p>
            No pedimos ni almacenamos datos de pago, ubicación, contactos ni archivos de tu
            dispositivo.
          </p>
        </Section>

        <Section title="Para qué los usamos">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>Crear y mantener tu perfil e iniciar sesión.</li>
            <li>Registrar tus pronósticos y calcular puntos y clasificaciones.</li>
            <li>Mostrar el ranking dentro de tus grupos.</li>
          </ul>
          <p>
            La base legal es la ejecución del servicio que solicitas al registrarte. No usamos tus
            datos para publicidad y no hay rastreadores de terceros.
          </p>
        </Section>

        <Section title="Con quién se comparten">
          <p>
            No vendemos ni cedemos tus datos. Nos apoyamos en proveedores que procesan datos por
            nuestra cuenta para que la app funcione:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <span className="font-semibold text-fg">Supabase</span> — base de datos y
              almacenamiento de cuentas y pronósticos.
            </li>
            <li>
              <span className="font-semibold text-fg">Vercel</span> — alojamiento de la aplicación
              web.
            </li>
            <li>
              <span className="font-semibold text-fg">football-data.org</span> — fuente de
              resultados de los partidos. Solo recibimos resultados;{" "}
              <span className="font-semibold text-fg">no se le envían datos personales tuyos</span>.
            </li>
          </ul>
        </Section>

        <Section title="Cuánto tiempo los guardamos">
          <p>
            Conservamos tus datos mientras tengas cuenta activa. Si solicitas la baja, eliminamos tu
            perfil y tus pronósticos. Tras el cierre del torneo podemos eliminar los datos que ya no
            sean necesarios.
          </p>
        </Section>

        <Section title="Seguridad">
          <p>
            El PIN se almacena cifrado (hash con bcrypt) y todas las comunicaciones viajan por
            conexiones seguras (HTTPS). Aun así, ningún sistema es infalible: elige un PIN que no uses
            en otros sitios.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Puedes solicitar acceso, rectificación o supresión de tus datos, así como retirar tu
            consentimiento, escribiendo a{" "}
            <a className="font-semibold text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            . Si resides en la UE, también puedes reclamar ante tu autoridad de protección de datos.
          </p>
        </Section>

        <Section title="Menores">
          <p>
            {APP_NAME} no está dirigida a menores de 14 años. Si crees que un menor nos ha facilitado
            datos, contáctanos y los eliminaremos.
          </p>
        </Section>

        <Section title="Cambios">
          <p>
            Podemos actualizar esta política. Publicaremos aquí la nueva versión con su fecha de
            actualización.
          </p>
        </Section>
      </div>

      <footer className="border-t border-line pt-6 text-sm text-muted">
        {APP_NAME} · Política de privacidad · {LAST_UPDATED}
      </footer>
    </main>
  );
}
