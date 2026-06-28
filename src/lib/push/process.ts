import "server-only";

/**
 * Procesa y ENVÍA las notificaciones push pendientes. Pensado para ejecutarse
 * con el mismo cron que sincroniza resultados (cada pocos minutos).
 *
 * Tipos:
 *   · close   → una vez por jornada, ~3 h antes del primer partido, si te faltan
 *               pronósticos en ella.
 *   · phase   → al empezar una fase nueva (octavos, cuartos…), una sola vez.
 *   · result  → cuando un partido tuyo se cierra: marcador y puntos.
 *   · rank    → cuando alguien te adelanta en el ranking de un grupo.
 *
 * Idempotencia: los avisos puntuales se registran en push_notifications_sent con
 * una clave única; el ranking se compara contra push_rank_state. Sin tokens/SW
 * configurados (VAPID), no hace nada. Nunca lanza: devuelve un parte.
 */
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeam } from "@/data/tournament/teams";
import { PREDICTION_LOCK_LEAD_MS } from "@/lib/matches/schedule";
import { isPushConfigured, sendPush, type PushPayload } from "./webpush";

const CLOSE_LEAD_MS = 3 * 60 * 60 * 1000; // aviso 3 h antes del 1.er partido
const PHASE_WINDOW_MS = 6 * 60 * 60 * 1000; // "recién empezada" la fase
const RESULT_WINDOW_MS = 8 * 60 * 60 * 1000; // resultado "reciente" (evita avisar del pasado)

const PHASE_LABEL: Record<string, string> = {
  round32: "los dieciseisavos",
  round16: "los octavos",
  quarter: "los cuartos",
  semi: "las semifinales",
  third: "el partido por el 3.er puesto",
  final: "la final",
};

interface SubRow {
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
interface MatchRow {
  match_number: number;
  phase: string;
  matchday_id: number;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
}
interface PredRow {
  group_id: string;
  profile_id: string;
  match_number: number;
  points_awarded: number | null;
}
interface StandRow {
  group_id: string;
  profile_id: string;
  rank: number;
}

async function fetchAllPredictions(admin: ReturnType<typeof createSupabaseAdmin>): Promise<PredRow[]> {
  const PAGE = 1000;
  const all: PredRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = (await admin
      .from("predictions")
      .select("group_id, profile_id, match_number, points_awarded")
      .order("match_number", { ascending: true })
      .order("profile_id", { ascending: true })
      .range(from, from + PAGE - 1)) as unknown as { data: PredRow[] | null; error: unknown };
    if (error) break;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

export async function processNotifications(now: number = Date.now()) {
  if (!isPushConfigured()) return { ok: true, skipped: "vapid-no-configurado" as const };

  const admin = createSupabaseAdmin();

  const [{ data: subs }, { data: matches }, { data: members }, { data: stands }, { data: rankState }] =
    await Promise.all([
      admin.from("push_subscriptions").select("profile_id, endpoint, p256dh, auth") as unknown as Promise<{ data: SubRow[] | null }>,
      admin
        .from("matches")
        .select("match_number, phase, matchday_id, kickoff_at, home_team_id, away_team_id, home_goals, away_goals") as unknown as Promise<{ data: MatchRow[] | null }>,
      admin.from("group_members").select("group_id, profile_id") as unknown as Promise<{ data: { group_id: string; profile_id: string }[] | null }>,
      admin.from("standings").select("group_id, profile_id, rank") as unknown as Promise<{ data: StandRow[] | null }>,
      admin.from("push_rank_state").select("group_id, profile_id, last_rank") as unknown as Promise<{ data: { group_id: string; profile_id: string; last_rank: number }[] | null }>,
    ]);

  const subsByProfile = new Map<string, SubRow[]>();
  for (const s of subs ?? []) {
    if (!subsByProfile.has(s.profile_id)) subsByProfile.set(s.profile_id, []);
    subsByProfile.get(s.profile_id)!.push(s);
  }
  if (subsByProfile.size === 0) return { ok: true, sent: 0, note: "sin-suscripciones" as const };

  const allMatches = matches ?? [];
  const preds = await fetchAllPredictions(admin);

  // Índices auxiliares.
  const predictedSet = new Set<string>(); // group:profile:match (¿pronosticó?)
  for (const p of preds) predictedSet.add(`${p.group_id}:${p.profile_id}:${p.match_number}`);

  const membersByGroup = new Map<string, string[]>();
  for (const m of members ?? []) {
    if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
    membersByGroup.get(m.group_id)!.push(m.profile_id);
  }

  // Candidatos con clave de idempotencia (close / phase / result).
  const candidates: { key: string; profileId: string; payload: PushPayload }[] = [];

  // --- A) Recordatorio de cierre (una vez por jornada) -----------------------
  const byMatchday = new Map<number, MatchRow[]>();
  for (const m of allMatches) {
    if (!byMatchday.has(m.matchday_id)) byMatchday.set(m.matchday_id, []);
    byMatchday.get(m.matchday_id)!.push(m);
  }
  for (const [mdId, ms] of byMatchday) {
    const earliest = Math.min(...ms.map((m) => Date.parse(m.kickoff_at)));
    if (!(now >= earliest - CLOSE_LEAD_MS && now < earliest)) continue; // fuera de ventana
    for (const [groupId, profileIds] of membersByGroup) {
      for (const profileId of profileIds) {
        if (!subsByProfile.has(profileId)) continue;
        const pending = ms.filter(
          (m) =>
            now < Date.parse(m.kickoff_at) - PREDICTION_LOCK_LEAD_MS &&
            !predictedSet.has(`${groupId}:${profileId}:${m.match_number}`),
        ).length;
        if (pending === 0) continue;
        candidates.push({
          key: `close:${groupId}:${mdId}:${profileId}`,
          profileId,
          payload: {
            title: "Cierra pronto la jornada",
            body: `Te faltan ${pending} ${pending === 1 ? "partido" : "partidos"} por pronosticar.`,
            url: `/grupo/${groupId}`,
            tag: `close-${groupId}-${mdId}`,
          },
        });
      }
    }
  }

  // --- B) Inicio de fase (una vez por fase, recién empezada) ------------------
  const phaseStart = new Map<string, number>();
  for (const m of allMatches) {
    const t = Date.parse(m.kickoff_at);
    const cur = phaseStart.get(m.phase);
    if (cur == null || t < cur) phaseStart.set(m.phase, t);
  }
  for (const [phase, start] of phaseStart) {
    const label = PHASE_LABEL[phase];
    if (!label) continue; // 'group' u otros: no anunciamos
    if (!(now >= start && now - start < PHASE_WINDOW_MS)) continue;
    for (const profileId of subsByProfile.keys()) {
      candidates.push({
        key: `phase:${phase}:${profileId}`,
        profileId,
        payload: {
          title: "¡Nueva fase!",
          body: `Empiezan ${label}. Entra y pronostica los cruces.`,
          url: "/grupos",
          tag: `phase-${phase}`,
        },
      });
    }
  }

  // --- C) Resultado y puntos (por partido reciente y pick) -------------------
  const matchByNum = new Map<number, MatchRow>(allMatches.map((m) => [m.match_number, m]));
  for (const p of preds) {
    const m = matchByNum.get(p.match_number);
    if (!m || m.home_goals == null || m.away_goals == null) continue;
    const ko = Date.parse(m.kickoff_at);
    if (!(now > ko && now - ko < RESULT_WINDOW_MS)) continue; // solo recientes
    if (!subsByProfile.has(p.profile_id)) continue;
    const home = m.home_team_id ? getTeam(m.home_team_id)?.name ?? "?" : "?";
    const away = m.away_team_id ? getTeam(m.away_team_id)?.name ?? "?" : "?";
    const pts = p.points_awarded ?? 0;
    candidates.push({
      key: `result:${m.match_number}:${p.group_id}:${p.profile_id}`,
      profileId: p.profile_id,
      payload: {
        title: `${home} ${m.home_goals}-${m.away_goals} ${away}`,
        body: pts > 0 ? `¡Has sacado ${pts} ${pts === 1 ? "punto" : "puntos"}! 🎯` : "Esta vez no has puntuado.",
        url: `/grupo/${p.group_id}`,
        tag: `result-${m.match_number}-${p.group_id}`,
      },
    });
  }

  // Dedupe contra lo ya enviado.
  const keys = candidates.map((c) => c.key);
  const alreadySent = new Set<string>();
  for (let i = 0; i < keys.length; i += 200) {
    const chunk = keys.slice(i, i + 200);
    const { data } = (await admin
      .from("push_notifications_sent")
      .select("dedupe_key")
      .in("dedupe_key", chunk)) as unknown as { data: { dedupe_key: string }[] | null };
    for (const r of data ?? []) alreadySent.add(r.dedupe_key);
  }

  const goneEndpoints = new Set<string>();
  const deliveredKeys: string[] = [];
  let sent = 0;

  async function deliver(profileId: string, payload: PushPayload): Promise<boolean> {
    const list = subsByProfile.get(profileId) ?? [];
    let any = false;
    for (const s of list) {
      const r = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
      if (r === "ok") any = true;
      else if (r === "gone") goneEndpoints.add(s.endpoint);
    }
    return any;
  }

  for (const c of candidates) {
    if (alreadySent.has(c.key)) continue;
    alreadySent.add(c.key); // evita duplicar dentro de la misma pasada
    const ok = await deliver(c.profileId, c.payload);
    if (ok) {
      deliveredKeys.push(c.key);
      sent++;
    }
  }

  if (deliveredKeys.length) {
    for (let i = 0; i < deliveredKeys.length; i += 500) {
      await admin
        .from("push_notifications_sent")
        .upsert(deliveredKeys.slice(i, i + 500).map((dedupe_key) => ({ dedupe_key })), {
          onConflict: "dedupe_key",
        });
    }
  }

  // --- D) Adelantamientos en el ranking --------------------------------------
  const lastRank = new Map<string, number>();
  for (const r of rankState ?? []) lastRank.set(`${r.group_id}:${r.profile_id}`, r.last_rank);
  const groupName = new Map<string, string>();
  {
    const { data: grows } = (await admin.from("groups").select("id, name")) as unknown as {
      data: { id: string; name: string }[] | null;
    };
    for (const g of grows ?? []) groupName.set(g.id, g.name);
  }
  const rankUpserts: { group_id: string; profile_id: string; last_rank: number; updated_at: string }[] = [];
  for (const s of stands ?? []) {
    if (!subsByProfile.has(s.profile_id)) continue;
    const k = `${s.group_id}:${s.profile_id}`;
    const prev = lastRank.get(k);
    if (prev != null && s.rank > prev) {
      // Ha bajado de puesto → alguien le adelantó.
      const ok = await deliver(s.profile_id, {
        title: "Te han adelantado",
        body: `Ahora vas ${s.rank}º en «${groupName.get(s.group_id) ?? "tu quiniela"}».`,
        url: `/grupo/${s.group_id}`,
        tag: `rank-${s.group_id}`,
      });
      if (ok) sent++;
    }
    if (prev == null || prev !== s.rank) {
      rankUpserts.push({
        group_id: s.group_id,
        profile_id: s.profile_id,
        last_rank: s.rank,
        updated_at: new Date(now).toISOString(),
      });
    }
  }
  if (rankUpserts.length) {
    for (let i = 0; i < rankUpserts.length; i += 500) {
      await admin
        .from("push_rank_state")
        .upsert(rankUpserts.slice(i, i + 500), { onConflict: "group_id,profile_id" });
    }
  }

  // Limpia suscripciones muertas.
  if (goneEndpoints.size) {
    await admin.from("push_subscriptions").delete().in("endpoint", Array.from(goneEndpoints));
  }

  return { ok: true, sent, pruned: goneEndpoints.size };
}
