import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "JOGLO POS",
        short_name: "JogloPOS",
        description: "Sistem Kasir & Produksi",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "landscape",
        icons: [
          {
            src: "pwa-192x192.png", // <--- Sistem akan mencari file ini nanti
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png", // <--- Dan file ini
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
