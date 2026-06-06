import type { Config } from "tailwindcss";

/**
 * Sistema visual "QuiniBall" (temática Mundial 2026): fondo azul marino con foto
 * del balón difuminada, primario AZUL (acciones/selección) y acento DORADO
 * (puntos/resaltados). Los colores del cubo del logo (1 verde · X rojo · 2 azul)
 * se usan en los botones de pronóstico. Titulares en Saira Condensed; cuerpo Manrope.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0e20", // fondo de página (azul marino muy oscuro)
        surface: "#141826", // tarjetas
        surface2: "#1b2032", // inputs / superficies elevadas
        surface3: "#252b40", // chips / pills
        line: "rgba(255,255,255,0.08)", // bordes sutiles
        line2: "rgba(255,255,255,0.15)", // bordes más visibles
        fg: "#f4f6fb", // texto principal
        muted: "#8d92a6", // texto secundario
        muted2: "#6a6f84", // texto terciario / placeholders
        primary: {
          DEFAULT: "#2563eb", // azul mundialista — acciones / selección
          strong: "#3b82f6", // hover
          ink: "#ffffff", // texto sobre primario
        },
        accent: {
          DEFAULT: "#facc15", // dorado — puntos, kicker, partido estrella
          soft: "rgba(250,204,21,0.16)",
        },
        // Colores del cubo 1·X·2 del logo (identidad de la marca).
        pick1: "#1f9d4d", // 1 — verde
        pickx: "#e23b3b", // X — rojo
        pick2: "#2f6bff", // 2 — azul
        good: "#34d399",
        bad: "#fb7185",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Arial Narrow'", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem", // 14px (botones/inputs)
        "2xl": "1rem", // 16px (tarjetas)
        "3xl": "1.25rem", // 20px (--radius)
      },
    },
  },
  plugins: [],
} satisfies Config;
