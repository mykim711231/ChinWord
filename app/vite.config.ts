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
        // tts mp3 까지 precache 하면 초기 설치 페이로드가 10MB+ 로 폭증한다.
        // 정적 자산(public/tts/*.mp3)이 dist 에 함께 배포되므로 런타임 CacheFirst 로
        // 처음 재생 시점에만 캐시한다 — 평균 학습자는 사용한 단어만 받게 된다.
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2}"],
        // mp3 한 파일이 평균 20~50KB → 1,300개 합쳐도 30MB 미만.
        // 단일 PWA 캐시 한도 기본 2MB 를 넘으므로 maximumFileSizeToCacheInBytes 도 상향.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "content-json" },
          },
          {
            urlPattern: /\/tts\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "tts-mp3",
              // 매니페스트 ~1,300 항목 + 안전 마진.
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
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
