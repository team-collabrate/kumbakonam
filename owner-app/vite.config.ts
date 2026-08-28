import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 5174 },
  preview: { port: 5174 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "Kumbakonam Dashboard",
        short_name: "KDash",
        description: "Kumbakonam Cafe — sales dashboard & menu management",
        theme_color: "#FAFAF8",
        background_color: "#FAFAF8",
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
        // `png` covers the brand logo on the lock screen — without it cached,
        // reopening the installed app offline would show a logo-less PIN
        // screen (the img hides itself on error rather than showing a broken
        // glyph, so the failure would be silent).
        globPatterns: ["**/*.{js,css,html,svg,png}"],
      },
    }),
  ],
});
