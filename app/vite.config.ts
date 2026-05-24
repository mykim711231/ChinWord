import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// 듀얼 배포 타깃: 기본은 GitHub Pages(/ChinWord/), DEPLOY_TARGET=cf 면 루트(/).
const isCloudflare = process.env.DEPLOY_TARGET === "cf";
const base = isCloudflare ? "/" : "/ChinWord/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo.svg"],
      manifest: {
        name: "ChinWord 中国语",
        short_name: "ChinWord",
        description: "중국어 어휘 학습 PWA — 상황별 단어 · 고사성어 · 필순 · TTS · SRS",
        theme_color: "#DC2626",
        background_color: "#FAFAFA",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: "logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "content-json" },
          },
          {
            urlPattern: /hanzi-writer-data/,
            handler: "CacheFirst",
            options: {
              cacheName: "hanzi-data",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          state: ["zustand", "idb-keyval"],
          search: ["minisearch"],
          hanzi: ["hanzi-writer"],
          icons: ["lucide-react"],
        },
      },
    },
  },
  server: { port: 5173, open: false },
});
