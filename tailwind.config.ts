import type { Config } from "tailwindcss";

/**
 * Sistema visual "QuiniBall": fondo oscuro casi-negro con halo violeta, primario
 * VERDE (acciones/selección) y acento AMARILLO (puntos/resaltados). Titulares en
 * Saira Condensed (itálica, mayúsculas); cuerpo en Manrope.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b11", // fondo de página (dentro del "dispositivo")
        surface: "#15151d", // tarjetas
        surface2: "#1e1e29", // inputs / superficies elevadas
        surface3: "#262633", // chips / pills
        line: "rgba(255,255,255,0.08)", // bordes sutiles
        line2: "rgba(255,255,255,0.14)", // bordes más visibles
        fg: "#f4f4f8", // texto principal
        muted: "#8c8c9a", // texto secundario
        muted2: "#6a6a78", // texto terciario / placeholders
        primary: {
          DEFAULT: "#1F8A5B", // verde — acciones primarias / selección
          strong: "#23a06a", // hover
          ink: "#ffffff", // texto sobre primario
        },
        accent: {
          DEFAULT: "#facc15", // amarillo — puntos, kicker, resaltados
          soft: "rgba(250,204,21,0.16)",
        },
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
