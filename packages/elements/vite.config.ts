import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ include: ["src"], rollupTypes: false, insertTypesEntry: true })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: (asset) =>
          asset.names?.[0]?.endsWith(".css") ? "kernel.css" : "assets/[name][extname]",
      },
    },
  },
});
