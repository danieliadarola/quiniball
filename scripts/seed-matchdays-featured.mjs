/**
 * Elige el "partido de la jornada" (destacado) de cada jornada de forma
 * ALEATORIA y GLOBAL (el mismo para todas las quinielas). Ese partido puntúa
 * 1X2 (3) + marcador exacto (+5); el resto solo 1X2.
 *
 * Uso:
 *   node --env-file=.env.local scripts/seed-matchdays-featured.mjs
 *   node --env-file=.env.local scripts/seed-matchdays-featured.mjs --reroll
 *
 * Por defecto solo asigna las jornadas que aún NO tienen destacado (idempotente).
 * Con --reroll vuelve a sortear TODAS.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reroll = process.argv.includes("--reroll");

if (!url || !service) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

const { data: matchdays, error: mdErr } = await admin
  .from("matchdays")
  .select("id, code, name, featured_match_number")
  .order("id");

if (mdErr) {
  console.error("❌ Error leyendo jornadas:", mdErr.message);
  process.exit(1);
}

let assigned = 0;
for (const md of matchdays) {
  if (md.featured_match_number !== null && !reroll) {
    console.log(`• ${md.code}: ya tiene destacado (#${md.featured_match_number}), se respeta.`);
    continue;
  }

  // Candidatos: todos los partidos de la jornada.
  const { data: candidates, error: cErr } = await admin
    .from("matches")
    .select("match_number")
    .eq("matchday_id", md.id);

  if (cErr) {
    console.error(`❌ Error leyendo partidos de ${md.code}:`, cErr.message);
    process.exit(1);
  }
  if (!candidates || candidates.length === 0) {
    console.warn(`⚠️  ${md.code} no tiene partidos; se omite.`);
    continue;
  }

  // La jornada Final SIEMPRE destaca la final (mayor nº de partido), no el azar.
  const pick =
    md.code === "F"
      ? Math.max(...candidates.map((c) => c.match_number))
      : candidates[Math.floor(Math.random() * candidates.length)].match_number;

  const { error: uErr } = await admin
    .from("matchdays")
    .update({ featured_match_number: pick })
    .eq("id", md.id);

  if (uErr) {
    console.error(`❌ Error fijando destacado de ${md.code}:`, uErr.message);
    process.exit(1);
  }

  console.log(`✅ ${md.code} (${md.name}): partido destacado = #${pick} (de ${candidates.length} candidatos)`);
  assigned++;
}

console.log(`\nHecho. Jornadas actualizadas: ${assigned}/${matchdays.length}.`);
