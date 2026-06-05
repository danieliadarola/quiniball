/**
 * Verificación rápida de conexión a Supabase.
 * Uso:  node --env-file=.env.local scripts/check-connection.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false },
});

const { data, error, count } = await supabase
  .from("venues")
  .select("id, city, country", { count: "exact" })
  .order("country");

if (error) {
  console.error("❌ Error de conexión/consulta:", error.message);
  process.exit(1);
}

console.log(`✅ Conexión OK. Sedes leídas: ${count}`);
for (const v of data) console.log(`   · ${v.city} (${v.country})`);
