"use client";

/**
 * Interruptor de notificaciones push para ESTE dispositivo.
 *
 * Registra el service worker, pide permiso, se suscribe con la clave pública
 * VAPID y guarda la suscripción en el servidor. Apagarlo borra la suscripción.
 *
 * Si el navegador no soporta Web Push (típico en el WebView de la app Android),
 * lo indica con un aviso en vez de un interruptor roto.
 */
import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "working";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported || !VAPID_PUBLIC) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, [supported]);

  async function enable() {
    setError(null);
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("No se pudo guardar la suscripción.");
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron activar las notificaciones.");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">Notificaciones</h3>
          <p className="mt-0.5 text-xs text-muted">
            Avisos en este dispositivo: cierres de jornada, resultados y ranking.
          </p>
        </div>
        <Switch state={state} onEnable={enable} onDisable={disable} />
      </div>

      {state === "unsupported" && (
        <p className="rounded-xl border border-line bg-surface2 px-3 py-2 text-[12px] text-muted">
          Este navegador no admite notificaciones. En el móvil, instala QuiniBall como
          aplicación (Añadir a pantalla de inicio) y actívalas desde ahí.
        </p>
      )}
      {state === "denied" && (
        <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-[12px] text-bad">
          Has bloqueado las notificaciones. Habilítalas en los ajustes del navegador para este sitio.
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-[12px] text-bad">{error}</p>
      )}
    </section>
  );
}

function Switch({
  state,
  onEnable,
  onDisable,
}: {
  state: State;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const disabled = state === "loading" || state === "working" || state === "unsupported" || state === "denied";
  const on = state === "on";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={on ? onDisable : onEnable}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 ${
        on ? "border-transparent bg-primary" : "border-line2 bg-surface3"
      }`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition-all ${
          on ? "left-[26px]" : "left-1"
        }`}
      />
    </button>
  );
}
