/**
 * Marca un perfil como administrador de la app (puede introducir resultados).
 * Uso: node --env-file=.env.local scripts/set-admin.mjs "<nombre mostrado>"
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const name = process.argv[2];

if (!name) {
  console.error('Uso: node --env-file=.env.local scripts/set-admin.mjs "<nombre mostrado>"');
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

const { data, error } = await admin
  .from("profiles")
  .update({ is_admin: true })
  .eq("display_name", name)
  .select("id, display_name");

if (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
if (!data || data.length === 0) {
  console.log(`⚠️  No se encontró ningún perfil con el nombre "${name}". Regístrate primero en la app.`);
} else {
  console.log(`✅ Ahora es administrador: ${data.map((p) => p.display_name).join(", ")}`);
}
