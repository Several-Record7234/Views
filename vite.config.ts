import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));

/**
 * Rewrite dist/manifest.json "version" to match package.json at build time.
 * Uses closeBundle (post-copy) because public/ files bypass the Rollup bundle
 * pipeline and are never present in the generateBundle bundle object.
 */
function injectManifestVersion(): Plugin {
  return {
    name: "inject-manifest-version",
    apply: "build",
    closeBundle() {
      const manifestPath = resolve(__dirname, "dist", "manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      manifest.version = pkg.version;
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    },
  };
}

export default defineConfig({
  base: "",
  plugins: [react(), tailwindcss(), injectManifestVersion()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        whatsNew: resolve(__dirname, "whats-new.html"),
      },
    },
  },
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
});
