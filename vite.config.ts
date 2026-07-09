import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages serves this project from https://<user>.github.io/piano-tutor/
// so all asset URLs must be prefixed with the repo name in production.
const REPO_BASE = "/piano-tutor/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? REPO_BASE : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Practice shouldn't need Wi-Fi: precache the app shell + song library.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        navigateFallback: "index.html",
      },
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Piano Tutor",
        short_name: "Piano Tutor",
        description: "A free piano tutorial player for kids.",
        theme_color: "#5b8def",
        background_color: "#fbfcff",
        display: "standalone",
        orientation: "landscape",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
}));
