import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ["src"], rollupTypes: false, insertTypesEntry: true }),
  ],
  css: {
    modules: {
      // Human-readable, low-collision class names: kernel-Button-root,
      // kernel-Button-icon, etc. Stable across builds so consumers can
      // target them from outside the module if they ever need to.
      generateScopedName: "kernel-[folder]-[local]",
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith(".css") ? "kernel.css" : "assets/[name][extname]",
      },
    },
  },
});
