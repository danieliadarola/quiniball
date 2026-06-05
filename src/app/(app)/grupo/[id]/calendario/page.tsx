import { redirect } from "next/navigation";

/** El calendario ahora vive dentro de la pantalla de quiniela (pestaña Partidos). */
export default async function CalendarRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/grupo/${id}`);
}
