/**
 * Ruta interna que genera el SVG del avatar (DiceBear) a partir de `style` y
 * `seed`. Como el resultado es determinista, se cachea de forma agresiva e
 * inmutable: cada combinación se genera una vez y se sirve desde caché.
 */
import { generateAvatarSvg } from "@/lib/avatar/generate";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const style = searchParams.get("style") ?? "";
  const seed = searchParams.get("seed") ?? "";

  const svg = generateAvatarSvg(style, seed);
  if (!svg) {
    return new Response("Avatar no válido", { status: 400 });
  }

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
