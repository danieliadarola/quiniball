import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Alinea el alias "@/..." de vitest con el de tsconfig.json ("@/*" -> "src/*").
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
