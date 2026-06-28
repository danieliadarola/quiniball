import "server-only";

/**
 * Envío de Web Push con VAPID. Aísla la librería `web-push` y normaliza el
 * resultado: "ok", "gone" (la suscripción caducó y hay que borrarla) o "error".
 */
import webpush from "web-push";

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:soporte@quiniball.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** ¿Está el Web Push configurado (claves presentes)? */
export function isPushConfigured(): boolean {
  return configure();
}

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Ruta a abrir al pulsar la notificación. */
  url?: string;
  /** Agrupa/reemplaza notificaciones del mismo tipo. */
  tag?: string;
}

/**
 * Envía una notificación a una suscripción. Devuelve "gone" si el navegador
 * indica que la suscripción ya no existe (404/410) para que el llamador la
 * elimine de la base de datos.
 */
export async function sendPush(
  sub: PushSub,
  payload: PushPayload,
): Promise<"ok" | "gone" | "error"> {
  if (!configure()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 6 },
    );
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return "gone";
    return "error";
  }
}
