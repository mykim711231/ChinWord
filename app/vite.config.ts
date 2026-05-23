import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gababayo\.github\.io\/ChinWord\/.*\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "content-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "ChinVoca 中国语",
        short_name: "ChinVoca",
        description: "중국어 어휘 학습 PWA",
        theme_color: "#DC2626",
        background_color: "#FAFAFA",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
    }),
  ],
  base: "/ChinWord/",
  resolve: {
    alias: { "@": "/src" },
  },
});
