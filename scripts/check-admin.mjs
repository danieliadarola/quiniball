/**
 * Verifica la clave service_role: hace una operación que la RLS prohíbe a anon
 * (insertar en `teams`), y luego limpia. Si funciona, la clave es correcta.
 * Uso:  node --env-file=.env.local scripts/check-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

const { error: insErr } = await admin
  .from("teams")
  .insert({ id: "__test__", code: "TST", name: "Prueba", flag: "🏳️" });

if (insErr) {
  console.error("❌ La service_role NO pudo insertar:", insErr.message);
  process.exit(1);
}

const { error: delErr } = await admin.from("teams").delete().eq("id", "__test__");
if (delErr) {
  console.error("⚠️ Insert OK pero no se pudo limpiar:", delErr.message);
  process.exit(1);
}

console.log("✅ service_role correcta: insertó y limpió saltándose RLS.");
