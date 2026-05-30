import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// 듀얼 배포 타깃: 기본은 GitHub Pages(/ChinWord/), DEPLOY_TARGET=cf 면 루트(/).
const isCloudflare = process.env.DEPLOY_TARGET === "cf";
const base = isCloudflare ? "/" : "/ChinWord/";

// 빌드 식별자 — version + git 단축 해시. sw.ts 가 iOS 중복 waiting worker
// (WebKit #75981032) 무한 루프 방지에 사용한다(동일 해시면 skipWaiting 거부).
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version: string };
const GIT_HASH = (() => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return Date.now().toString(36);
  }
})();
const BUILD_HASH = `${pkg.version}-${GIT_HASH}`;

// 사전녹음 zh-tts mp3 캐시 용량(maxEntries). "중국어 음성 미리 받기"(일괄
// 다운로드)가 매니페스트 전체를 받으므로, cap 이 파일 수보다 작으면 받자마자
// LRU evict 돼 무의미하다. 매니페스트 고유 파일 수 + 10% 마진으로 동적 설정.
// (바이트 한도 초과는 sw.ts 의 purgeOnQuotaError 가 별도로 처리.)
const TTS_UNIQUE_FILES = (() => {
  try {
    const m = JSON.parse(
      readFileSync(
        path.resolve(__dirname, "src/data/zh-tts-manifest.json"),
        "utf-8",
      ),
    ) as Record<string, string>;
    return new Set(Object.values(m)).size;
  } catch {
    return 2000;
  }
})();
const TTS_CACHE_MAX_ENTRIES = Math.max(2000, Math.ceil(TTS_UNIQUE_FILES * 1.1));

export default defineConfig({
  base,
  define: {
    // main.tsx, sw.ts 양쪽에서 사용 (injectManifest 빌드에도 적용됨).
    __BUILD_HASH__: JSON.stringify(BUILD_HASH),
    // sw.ts tts-mp3 ExpirationPlugin.maxEntries — 매니페스트 크기 기반.
    __TTS_CACHE_MAX_ENTRIES__: JSON.stringify(TTS_CACHE_MAX_ENTRIES),
  },
  plugins: [
    react(),
    VitePWA({
      // prompt: 새 SW 를 자동 적용하지 않고 페이지(main.tsx)가 제어한다.
      registerType: "prompt",
      // injectManifest 모드 — sw.ts 를 직접 작성한다.
      // generateSW 와 달리 precache install 단계에서 fetch 한 건씩 진행률을
      // postMessage 로 보고할 수 있어 실제 다운로드 진행 바를 그릴 수 있다.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.svg", "logo.svg"],
      manifest: {
        // id/start_url/scope 를 base 로 고정 — 미지정 시 홈 추가 당시 경로
        // (#/learn 등)에서 부팅돼 흰 화면이 날 수 있다. 항상 홈에서 시작.
        id: base,
        name: "ChinWord 中国语",
        short_name: "ChinWord",
        description:
          "중국어 어휘 학습 PWA — 상황별 단어 · 고사성어 · 필순 · TTS · SRS",
        theme_color: "#DC2626",
        background_color: "#FAFAFA",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        // App shell + route 청크 + 번들된 콘텐츠 데이터를 precache.
        // tts mp3(public/tts/*.mp3, 16k+ 파일)는 제외 — sw.ts 가 런타임
        // CacheFirst 로 처음 재생 시점에만 캐시한다.
        globPatterns: [
          "**/*.{css,html,svg,ico,woff2,webmanifest}",
          "assets/*.js",
        ],
        globIgnores: ["sw.js", "workbox-*.js"],
        // 콘텐츠 JSON 이 번들된 청크가 커질 수 있어 안전 마진 5 MiB.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
