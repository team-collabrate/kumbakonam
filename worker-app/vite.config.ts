import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 5173 },
  preview: { port: 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "Kumbakonam POS",
        short_name: "KPOS",
        description: "Kumbakonam Cafe — counter order & billing",
        theme_color: "#14151A",
        background_color: "#14151A",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "pwa-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell only — order/menu data goes through Firestore's own
        // offline cache (TDD §3/§4), not the service worker.
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
