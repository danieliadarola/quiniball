/**
 * Catálogo de estilos de avatar (DiceBear) que ofrecemos en el selector.
 * Datos puros (sin la librería): se pueden importar tanto en cliente como en
 * servidor. La generación del SVG vive en `generate.ts` (solo servidor).
 *
 * Guardamos por perfil dos textos: `avatar_style` (una de estas claves) y
 * `avatar_seed` (la semilla que fija el personaje concreto).
 */
export interface AvatarStyleDef {
  key: string;
  label: string;
}

// Estilos OFRECIDOS en el selector: curados con un tono gracioso/meme.
export const AVATAR_STYLES: AvatarStyleDef[] = [
  { key: "funEmoji", label: "Emoji" },
  { key: "bigSmile", label: "Risas" },
  { key: "bigEars", label: "Orejón" },
  { key: "croodles", label: "Garabato" },
  { key: "thumbs", label: "Bichejos" },
  { key: "toonHead", label: "Cabezón" },
  { key: "miniavs", label: "Mini" },
  { key: "bottts", label: "Robots" },
];

export const AVATAR_STYLE_KEYS = AVATAR_STYLES.map((s) => s.key);

export const DEFAULT_AVATAR_STYLE = "funEmoji";

// Estilos ACEPTADOS al renderizar (superset): incluye los del selector y los
// que se hayan podido guardar antes, para no romper avatares ya elegidos si
// cambiamos la lista del selector.
const ALLOWED_STYLE_KEYS = [
  ...AVATAR_STYLE_KEYS,
  "avataaars",
  "adventurer",
  "micah",
  "openPeeps",
  "pixelArt",
];

export function isValidAvatarStyle(s: string | null | undefined): s is string {
  return typeof s === "string" && ALLOWED_STYLE_KEYS.includes(s);
}

/** Semilla segura: corta y de caracteres simples (evita abusos en la URL). */
export function isValidAvatarSeed(s: string | null | undefined): s is string {
  return typeof s === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(s);
}

/** ¿El perfil tiene un avatar válido configurado? */
export function hasAvatar(
  style: string | null | undefined,
  seed: string | null | undefined,
): boolean {
  return isValidAvatarStyle(style) && isValidAvatarSeed(seed);
}

/** URL de nuestra ruta interna que genera el SVG (cacheada). */
export function avatarUrl(style: string, seed: string): string {
  return `/api/avatar?style=${encodeURIComponent(style)}&seed=${encodeURIComponent(seed)}`;
}
