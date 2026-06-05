import { redirect } from "next/navigation";

/** El ranking ahora vive dentro de la pantalla de quiniela (pestaña Ranking). */
export default async function RankingRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/grupo/${id}`);
}
