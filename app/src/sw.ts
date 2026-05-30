/// <reference lib="webworker" />
/**
 * ChinWord — Service Worker (injectManifest 모드)
 *
 * generateSW 모드와의 차이:
 *   - precache install 단계에서 fetch 한 건마다
 *     { type:'sw-precache-progress', phase, pct } 를 페이지로 postMessage 한다.
 *     (SW spec 에는 다운로드 % 이벤트가 없어 generateSW 에서는 진행 바를
 *      그릴 수 없었다.)
 *   - precache 전부 실패 시 install 을 reject → SW redundant → 페이지가
 *     즉시 에러 UI(재시도) 로 전환.
 *
 * 런타임 캐시(tts mp3 · hanzi-writer-data CDN · route 청크)는 기존
 * generateSW workbox.runtimeCaching 과 1:1 동등하다.
 */

import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";

// vite-plugin-pwa(injectManifest) 가 빌드 시 self.__WB_MANIFEST 를
// 실제 자산 목록으로 치환한다.
type PrecacheEntry = { url: string; revision: string | null };

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};
// vite define 에서 주입 — iOS 중복 waiting worker 무한 루프 방지용 빌드 식별자.
declare const __BUILD_HASH__: string;

const BUILD_HASH: string =
  typeof __BUILD_HASH__ !== "undefined" ? __BUILD_HASH__ : "dev";

// ────────────────────────────────────────────────────────────────────────────
// 캐시 이름
// ────────────────────────────────────────────────────────────────────────────

const PRECACHE = "app-precache-v1";
const VERSION_CACHE = "app-version";
const RUNTIME_CACHE_NAMES = ["tts-mp3", "hanzi-data", "route-chunks"];
const KEEP_CACHES = new Set<string>([
  PRECACHE,
  VERSION_CACHE,
  ...RUNTIME_CACHE_NAMES,
]);

// ────────────────────────────────────────────────────────────────────────────
// Precache 매니페스트 정규화
//   __WB_MANIFEST 의 url 은 base 상대 경로("index.html", "assets/index-abc.js").
//   브라우저 요청 URL.pathname 은 절대 경로("/ChinWord/index.html"). 매칭하려면
//   절대 경로로 통일한다. 캐시 키엔 revision 을 쿼리로 붙여 신/구 버전 구분.
// ────────────────────────────────────────────────────────────────────────────

const BASE_PATH = new URL(self.registration.scope).pathname;
const PRECACHE_MAP = new Map<string, string>();

for (const raw of self.__WB_MANIFEST ?? []) {
  const entry: PrecacheEntry =
    typeof raw === "string" ? { url: raw, revision: null } : raw;
  let absPath: string;
  if (entry.url.startsWith("http://") || entry.url.startsWith("https://")) {
    absPath = new URL(entry.url).pathname;
  } else if (entry.url.startsWith("/")) {
    absPath = entry.url;
  } else {
    absPath = BASE_PATH + entry.url;
  }
  const cacheKey = entry.revision
    ? `${absPath}?__rev=${encodeURIComponent(entry.revision)}`
    : absPath;
  PRECACHE_MAP.set(absPath, cacheKey);
}

// ────────────────────────────────────────────────────────────────────────────
// 진행률 보고 — 페이지(main.tsx)가 onMessage 로 받아 useUpdateStore 갱신.
// ────────────────────────────────────────────────────────────────────────────

type ProgressPhase = "downloading" | "installing" | "installed" | "error";

async function postProgress(
  phase: ProgressPhase,
  completed: number,
  total: number,
): Promise<void> {
  const pct =
    total === 0 ? 100 : Math.min(100, Math.round((completed / total) * 100));
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });
  for (const client of clients) {
    client.postMessage({
      type: "sw-precache-progress",
      phase,
      pct,
      completed,
      total,
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// install — fetch 동시성 4, 한 건 끝날 때마다 진행률 보고.
// ────────────────────────────────────────────────────────────────────────────

const FETCH_CONCURRENCY = 4;

// iOS standalone PWA 에서 byte-for-byte 동일 SW 가 waiting 으로 재진입하는
// WebKit 결함(#75981032) 대응. 빌드 해시가 이전과 같으면 skipWaiting 거부.
let isSameVersion = false;

self.addEventListener("install", (event) => {
  event.waitUntil(installPhase());
});

async function installPhase(): Promise<void> {
  const cache = await caches.open(VERSION_CACHE);
  const prev = await cache.match("hash");
  const prevHash = prev ? await prev.text() : null;
  if (prevHash === BUILD_HASH) isSameVersion = true;
  await cache.put("hash", new Response(BUILD_HASH));

  if (!isSameVersion) {
    await precacheAll();
  } else {
    // 동일 버전 → precache 생략, installed 메시지만 전송.
    await postProgress("installed", 0, 0);
  }
}

async function precacheAll(): Promise<void> {
  const entries = Array.from(PRECACHE_MAP.entries());
  const total = entries.length;
  let completed = 0;
  let failed = 0;

  await postProgress("downloading", 0, total);
  if (total === 0) {
    await postProgress("installed", 0, 0);
    return;
  }

  const cache = await caches.open(PRECACHE);
  const queue = [...entries];

  async function runWorker(): Promise<void> {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const [absPath, cacheKey] = next;
      try {
        // cache:'reload' — HTTP 캐시를 우회해 네트워크에서 최신 자산 캡처.
        const res = await fetch(absPath, { cache: "reload" });
        if (res.ok || res.type === "opaque") {
          await cache.put(cacheKey, res.clone());
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      completed++;
      const phase: ProgressPhase =
        completed / total < 0.85 ? "downloading" : "installing";
      await postProgress(phase, completed, total);
    }
  }

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, total) },
    () => runWorker(),
  );
  await Promise.all(workers);

  if (failed === total) {
    await postProgress("error", completed, total);
    throw new Error(`precache failed: 0/${total} entries cached`);
  }
  await postProgress("installed", completed, total);
}

// ────────────────────────────────────────────────────────────────────────────
// activate — 오래된 캐시 정리 + clientsClaim
// ────────────────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(activate());
});

async function activate(): Promise<void> {
  // 1. 모르는 캐시 일괄 삭제 (과거 generateSW workbox-precache 잔재 포함)
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => !KEEP_CACHES.has(name))
      .map((name) => caches.delete(name)),
  );

  // 2. PRECACHE 내부 stale 엔트리 정리 (이번 manifest 에 없는 URL)
  const cache = await caches.open(PRECACHE);
  const keepCacheKeys = new Set<string>(PRECACHE_MAP.values());
  const cachedRequests = await cache.keys();
  await Promise.all(
    cachedRequests
      .filter((req) => {
        const u = new URL(req.url);
        return !keepCacheKeys.has(u.pathname + u.search);
      })
      .map((req) => cache.delete(req)),
  );

  // 3. 첫 install 시 즉시 페이지 제어
  await self.clients.claim();

  // 4. 활성화 완료 알림
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SW_ACTIVATED" });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// message — 페이지의 SKIP_WAITING / GET_VERSION 처리
// ────────────────────────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  const data = event.data as { type?: string } | null | undefined;
  if (!data) return;
  if (data.type === "SKIP_WAITING") {
    if (isSameVersion) return; // iOS 중복 waiting worker: 동일 버전이면 거부
    void self.skipWaiting();
  }
  if (data.type === "GET_VERSION") {
    const port = (event as ExtendableMessageEvent).ports?.[0];
    if (port) {
      port.postMessage({ type: "VERSION_RESPONSE", hash: BUILD_HASH });
    } else if (event.source && "postMessage" in event.source) {
      (event.source as WindowClient).postMessage({
        type: "VERSION_RESPONSE",
        hash: BUILD_HASH,
      });
    }
  }
});

// ────────────────────────────────────────────────────────────────────────────
// fetch — precache 우선, navigation fallback, 나머지는 workbox-routing 위임
// ────────────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 교차 출처(hanzi-writer-data CDN 등)는 아래 registerRoute 가 처리.
  if (url.origin !== self.location.origin) return;

  // (a) SPA navigation — 캐시된 index.html 우선
  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(req));
    return;
  }

  // (b) precache 히트
  const cacheKey = PRECACHE_MAP.get(url.pathname);
  if (cacheKey) {
    event.respondWith(handlePrecache(cacheKey, req));
    return;
  }

  // (c) 나머지(런타임 캐시 대상)는 registerRoute 가 처리.
});

async function handleNavigation(req: Request): Promise<Response> {
  const indexAbsPath = `${BASE_PATH}index.html`;
  const indexKey = PRECACHE_MAP.get(indexAbsPath);
  if (indexKey) {
    const cache = await caches.open(PRECACHE);
    const cached = await cache.match(indexKey);
    if (cached) return cached;
  }
  try {
    return await fetch(req);
  } catch {
    return new Response(
      "<!doctype html><meta charset=\"utf-8\"><title>오프라인</title><p>오프라인 상태입니다.",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function handlePrecache(cacheKey: string, req: Request): Promise<Response> {
  const cache = await caches.open(PRECACHE);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  return fetch(req);
}

// ────────────────────────────────────────────────────────────────────────────
// 런타임 캐시 — 기존 generateSW workbox.runtimeCaching 과 1:1 이전
// ────────────────────────────────────────────────────────────────────────────

// 사전 녹음 zh TTS mp3 (public/tts/*.mp3). 평균 학습자는 들은 단어만 받는다.
// Workbox range-requests 권장 패턴 — 첫 200 응답을 캐시, 후속 Range 요청은
// 캐시본을 슬라이스해 206 으로 응답(206 자체는 캐시하지 않음).
// iOS Cache Storage 한도(~50MB) 초과 시 purgeOnQuotaError 로 LRU evict.
registerRoute(
  ({ url }) => url.pathname.includes("/tts/") && url.pathname.endsWith(".mp3"),
  new CacheFirst({
    cacheName: "tts-mp3",
    matchOptions: { ignoreVary: true },
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 2000,
        maxAgeSeconds: 60 * 60 * 24 * 365,
        purgeOnQuotaError: true,
      }),
      new RangeRequestsPlugin(),
    ],
  }),
);

// 필순 데이터(hanzi-writer-data CDN, 교차 출처). 앱은 IndexedDB(stroke-cache)에도
// 별도 저장하므로 dev/prod·SW 유무 무관하게 본 글자는 오프라인 가능 —
// 여기 SW 캐시는 prod 보조 계층. 각 JSON ~2-10KB.
registerRoute(
  ({ url }) => /hanzi-writer-data/.test(url.href),
  new CacheFirst({
    cacheName: "hanzi-data",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 5000,
        maxAgeSeconds: 60 * 60 * 24 * 365,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Route 청크 안전망 — precache 에 못 들어간 동적 import 자산.
//   precache 와 패턴이 겹쳐도 위 fetch 핸들러가 precache 히트를 가로채므로
//   여기까지 내려오는 건 precache 에 없는 청크에 한정된다.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    /\/assets\/.*\.js$/.test(url.pathname),
  new CacheFirst({
    cacheName: "route-chunks",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 90,
      }),
    ],
  }),
);
