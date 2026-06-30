import { defineConfig, type Plugin } from "vite";
import { resolve } from "path";
import { readFileSync } from "fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));

function injectManifestVersion(): Plugin {
  return {
    name: "inject-manifest-version",
    apply: "build",
    generateBundle(_options, bundle) {
      const asset = bundle["manifest.json"];
      if (asset && asset.type === "asset" && typeof asset.source === "string") {
        const manifest = JSON.parse(asset.source);
        manifest.version = pkg.version;
        asset.source = JSON.stringify(manifest, null, 2) + "\n";
      }
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
