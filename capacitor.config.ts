import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración de la app nativa (Android) de QuiniBall.
 *
 * La app NO empaqueta el sitio: es una cáscara nativa que carga la web de
 * Vercel en vivo (`server.url`), porque la app Next usa rutas de servidor
 * (API, auth) y no admite export estático. Así, cada despliegue en Vercel se
 * refleja al instante en el móvil sin republicar en Play Store.
 *
 * IMPORTANTE:
 *  - `server.url` queda "horneado" en cada build. Si algún día migras a un
 *    dominio propio, habrá que recompilar y subir una actualización a Play.
 *  - El `appId` es PERMANENTE una vez publicada la app en Google Play.
 *  - `webDir` solo aloja la pantalla de carga/offline local (ver capacitor-www).
 */
const config: CapacitorConfig = {
  appId: "com.quiniball.app",
  appName: "QuiniBall",
  webDir: "capacitor-www",
  server: {
    url: "https://quiniball.vercel.app",
    cleartext: false,
  },
};

export default config;
