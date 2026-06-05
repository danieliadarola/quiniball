/**
 * Verifica el flujo de quinielas (RPC create_group / join_group + RLS) con dos
 * jugadores reales. Uso: node --env-file=.env.local scripts/check-groups.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

const admin = createClient(url, service, { auth: { persistSession: false } });
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); process.exitCode = 1; };

async function mint(profileId) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(profileId).setAudience("authenticated")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(secret);
}
const clientFor = (token) =>
  createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

async function newProfile(name) {
  const { data } = await admin.from("profiles")
    .insert({ display_name: name, pin_hash: "x" }).select("id").single();
  return data.id;
}

const owner = await newProfile("Organizador");
const joiner = await newProfile("Compañero");
const outsider = await newProfile("Ajeno");
let groupId = null;

try {
  const ownerSb = clientFor(await mint(owner));
  const joinerSb = clientFor(await mint(joiner));
  const outsiderSb = clientFor(await mint(outsider));

  // 1) Crear quiniela
  const { data: g, error: cErr } = await ownerSb.rpc("create_group", {
    p_name: "Porra Test", p_mode: "mixto", p_knockout: "phased",
    p_lock: "per_match", p_join_code: "TST123", p_extras: ["champion"],
  }).single();
  if (cErr) throw new Error("create_group: " + cErr.message);
  groupId = g.id;
  ok(`Quiniela creada (código ${g.join_code})`);

  // 2) El organizador es owner y la ve
  const { data: ownerView } = await ownerSb.from("groups").select("id").eq("id", groupId).maybeSingle();
  ownerView ? ok("El organizador ve su quiniela (RLS)") : fail("El organizador NO ve su quiniela");

  // 3) Un ajeno NO la ve
  const { data: outView } = await outsiderSb.from("groups").select("id").eq("id", groupId).maybeSingle();
  outView ? fail("Un ajeno VE la quiniela (fuga de RLS)") : ok("Un ajeno no ve la quiniela (RLS aísla)");

  // 4) Unirse por código
  const { error: jErr } = await joinerSb.rpc("join_group", { p_code: "tst123" }); // minúsculas a propósito
  if (jErr) throw new Error("join_group: " + jErr.message);
  const { data: joinerView } = await joinerSb.from("groups").select("id").eq("id", groupId).maybeSingle();
  joinerView ? ok("El compañero se unió y ya ve la quiniela") : fail("El compañero no ve la quiniela tras unirse");

  // 5) Código inexistente
  const { error: badErr } = await joinerSb.rpc("join_group", { p_code: "NOPE99" });
  badErr && badErr.message.includes("GROUP_NOT_FOUND")
    ? ok("Código inexistente: rechazado (GROUP_NOT_FOUND)")
    : fail("Código inexistente: no rechazado");

  // 6) Recuento de miembros
  const { count } = await admin.from("group_members")
    .select("*", { count: "exact", head: true }).eq("group_id", groupId);
  count === 2 ? ok("La quiniela tiene 2 miembros (organizador + 1)") : fail(`Miembros inesperados: ${count}`);
} catch (e) {
  fail(e.message);
} finally {
  if (groupId) await admin.from("groups").delete().eq("id", groupId);
  await admin.from("profiles").delete().in("id", [owner, joiner, outsider]);
  console.log("   · Datos de prueba eliminados.");
}
