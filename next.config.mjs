/** @type {import('next').NextConfig} */

// Origen de Supabase (derivado de la env var; fallback al proyecto conocido).
// El navegador SOLO habla con Supabase de forma cross-origin: REST (https) y
// Realtime del ranking (wss). El resto (fuentes next/font, banderas flag-icons,
// avatares /api/avatar, QR data:) es mismo origen.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ovvmvreqkxthdclcaqug.supabase.co";
const supabaseOrigin = new URL(supabaseUrl).origin;
const supabaseWss = supabaseOrigin.replace(/^https:/, "wss:");

// Content-Security-Policy. Notas de por qué cada directiva es como es:
//  · script-src 'unsafe-inline': Next (App Router) inyecta scripts inline de
//    arranque y el payload RSC (self.__next_f.push). Sin esto, la app no hidrata
//    (pantalla en blanco). No se usa 'unsafe-eval' (no hace falta en producción).
//  · style-src 'unsafe-inline': Tailwind y los style={{...}} inline (gradientes,
//    avatares) son estilos inline.
//  · img-src data:: banderas empaquetadas, avatares y el QR (data: URI).
//  · connect-src: mismo origen + Supabase https (REST) y wss (Realtime).
//  · frame-ancestors 'self': anti-clickjacking (la app Android NO es un iframe,
//    carga la URL directamente, así que no le afecta).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWss}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'self'",
].join("; ");

// Cabeceras de seguridad aplicadas a TODAS las respuestas.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Fuerza HTTPS durante 2 años (Vercel sirve siempre https). includeSubDomains
  // es seguro: no hay subdominios propios bajo quiniball.vercel.app.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Defensa en profundidad junto a frame-ancestors.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desactiva APIs sensibles que la app no usa. NO se restringe topics/ads para
  // no estorbar a un futuro AdSense.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
