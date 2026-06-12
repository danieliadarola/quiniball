import "server-only";

/**
 * Generación del SVG del avatar con DiceBear (open-source, MIT) EN EL SERVIDOR.
 * No se llama a ningún servicio externo: la librería corre aquí y la ruta
 * `/api/avatar` devuelve el SVG con caché agresiva. El cliente solo guarda
 * `style` + `seed` (ver styles.ts).
 */
import { createAvatar } from "@dicebear/core";
import * as collection from "@dicebear/collection";
import { isValidAvatarStyle, isValidAvatarSeed } from "./styles";

// Paleta de fondos suave; DiceBear elige uno de forma estable según la semilla.
const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "c7f0d2", "fde68a"];

type DicebearStyle = Parameters<typeof createAvatar>[0];

/** Devuelve el SVG del avatar, o null si el estilo/semilla no son válidos. */
export function generateAvatarSvg(style: string, seed: string): string | null {
  if (!isValidAvatarStyle(style) || !isValidAvatarSeed(seed)) return null;

  const styleModule = (collection as Record<string, DicebearStyle>)[style];
  if (!styleModule) return null;

  return createAvatar(styleModule, {
    seed,
    size: 96,
    radius: 50,
    backgroundColor: BACKGROUNDS,
    backgroundType: ["solid"],
  }).toString();
}
