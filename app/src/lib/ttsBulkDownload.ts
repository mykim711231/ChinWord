/**
 * 사전녹음 zh mp3 일괄 다운로드 — "중국어 음성 미리 받기".
 *
 * 매니페스트의 mp3 를 fetch 만 하면(응답 body 는 버린다) sw.ts 의 tts-mp3
 * CacheFirst 라우트가 가로채 캐시에 적재한다. 따라서 이 모듈은 SW 캐시 워밍
 * 트리거다 — 한 번 받아두면 오프라인·비행기 모드에서도 음성이 재생된다.
 *
 * ─── 급수별 분할 (tier split) ───────────────────────────────────────────────
 * 매니페스트 전체(16,000+ 파일 ≈ 117MB)를 한 번에 받으면 회선·용량 부담이 크다.
 * 그래서 학습 콘텐츠를 급수 단위(기초 HSK1-4 / 중급 HSK5 / 고급 HSK6-9 / 성어)로
 * 나눠 받게 한다. 각 묶음은 그 급수의 단어 + 단어를 이루는 단음절 한자만 포함하며,
 * 급수끼리 공유하는 단음절은 SW 캐시에서 dedupe 돼 두 번째부터는 즉시 hit 한다.
 *
 * 통용규범한자 8,105 베이스(어떤 콘텐츠 단어에도 속하지 않는 단음절, ≈41MB)는
 * 의도적으로 제외한다 — 학습 콘텐츠가 아니고, 필순 단음절은 재생 시점 on-demand
 * 캐시로 충분하다. (이 on-demand 캐시는 sw.ts 가 maxEntries 한도 안에서 관리.)
 *
 * 동시성:
 *  - 6 worker 병렬 fetch — 모바일 회선에서도 안전. 더 높이면 일부 통신사에서
 *    소켓 제한·throttling 이 걸린다.
 *
 * 취소:
 *  - signal 로 중간 중단 — Settings 의 "중지" 버튼이 abort.
 *
 * 네트워크 보호:
 *  - 셀룰러/Low Data Mode 또는 회선 불명(iOS Safari) 이면 묶음 크기를 알려주고
 *    사용자 확인을 받는다. Wi-Fi 면 무음 진행.
 *
 * 재시도:
 *  - 첫 fetch 실패 시 800ms 백오프 후 1회 재시도(모바일 단발성 패킷 손실 대비).
 *
 * captive portal:
 *  - 호텔/카페 Wi-Fi 가 요청을 portal HTML 로 가로채면 200 OK 처럼 보이지만
 *    body 는 mp3 가 아니다. 첫 응답 content-type 을 검사해 audio/* 가 아니면
 *    즉시 중단한다(잘못된 응답이 캐시되는 것 방지).
 */
// 급수별 mp3 파일 목록은 build-content.ts 가 미리 굳혀둔 작은 맵에서 읽는다.
// (런타임이 1.7MB 테마 JSON·527KB 매니페스트를 Settings 청크로 끌어오지 않도록.)
import ttsTiers from "@/data/zh-tts-tiers.json";

export type TtsTier = "basic" | "mid" | "adv" | "idioms";

const TTS_TIERS = ttsTiers as Record<TtsTier, string[]>;
const TTS_BASE_URL = `${import.meta.env.BASE_URL}tts/`;

const CONCURRENCY = 6;
const RETRY_BACKOFF_MS = 800;
// 단일 mp3 평균 바이트(24kHz 48kbps mono). 실측 ≈ 7.2KB/파일 → 묶음 크기 추정용.
const AVG_BYTES_PER_FILE = 7400;

export type TtsTierMeta = {
  tier: TtsTier;
  label: string;
  fileCount: number;
  estMB: number;
};

// 아이콘은 렌더링 레이어(Settings)가 tier 키로 매핑한다 — 이 모듈은 부팅 차단
// 번들 영향이 큰 데이터 레이어라 React/아이콘 의존을 들이지 않는다.
const TIER_LABEL: Record<TtsTier, { label: string }> = {
  basic: { label: "기초 (HSK 1–4)" },
  mid: { label: "중급 (HSK 5)" },
  adv: { label: "고급 (HSK 6–9)" },
  idioms: { label: "고사성어" },
};

export const TTS_TIER_ORDER: TtsTier[] = ["basic", "mid", "adv", "idioms"];

export type BulkProgress = { done: number; failed: number; total: number };

export type BulkOptions = {
  onProgress?: (p: BulkProgress) => void;
  signal?: AbortSignal;
  /**
   * 셀룰러/Low Data/회선 불명 환경에서 호출되는 확인 콜백. resolve(true) 면 진행,
   * false 면 즉시 중단. 미제공 시 window.confirm 으로 fallback.
   */
  requireExpensiveConfirm?: () => Promise<boolean>;
};

export type BulkResult = {
  done: number;
  failed: number;
  total: number;
  aborted: boolean;
};

// ─── tier → 파일 목록 ─────────────────────────────────────────────────────

/** tier 의 고유 mp3 파일명 목록 (build-content.ts 가 매니페스트 기반으로 미리 계산). */
export function tierFiles(tier: TtsTier): string[] {
  return TTS_TIERS[tier] ?? [];
}

let _metaCache: TtsTierMeta[] | null = null;

/** 급수별 카드 메타(라벨·파일 수·추정 용량). */
export function getTtsTierMetas(): TtsTierMeta[] {
  if (_metaCache) return _metaCache;
  _metaCache = TTS_TIER_ORDER.map((tier) => {
    const fileCount = tierFiles(tier).length;
    return {
      tier,
      label: TIER_LABEL[tier].label,
      fileCount,
      estMB: Math.max(
        1,
        Math.round((fileCount * AVG_BYTES_PER_FILE) / (1024 * 1024)),
      ),
    };
  });
  return _metaCache;
}

// ─── 다운로드 코어 ────────────────────────────────────────────────────────

type NetCondition = "wifi" | "cellular" | "save-data" | "unknown";

/**
 * 회선 상태 판정.
 *  - Chrome/Android: navigator.connection.type / effectiveType
 *  - saveData(Low Data Mode) 는 셀룰러처럼 취급
 *  - iOS Safari: connection 미지원 → 'unknown' (한 번 확인)
 */
function detectNetworkCondition(): NetCondition {
  if (typeof navigator === "undefined") return "unknown";
  const conn = (
    navigator as unknown as {
      connection?: { type?: string; effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (!conn) return "unknown";
  if (conn.saveData === true) return "save-data";
  if (conn.type === "cellular") return "cellular";
  if (conn.type === "wifi" || conn.type === "ethernet") return "wifi";
  if (conn.effectiveType === "2g" || conn.effectiveType === "3g")
    return "cellular";
  if (conn.effectiveType === "4g") return "wifi";
  return "unknown";
}

function defaultExpensiveConfirm(
  condition: NetCondition,
  estMB: number,
): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function")
    return true;
  const size = `약 ${estMB}MB`;
  const msg =
    condition === "cellular"
      ? `현재 셀룰러(모바일 데이터)에 연결되어 있어요. 이 묶음은 ${size}를 사용합니다. 계속하시겠어요?`
      : condition === "save-data"
        ? `데이터 절약 모드가 켜져 있어요. ${size}를 받게 되는데 계속하시겠어요?`
        : `현재 회선이 Wi-Fi인지 확인할 수 없어요. 이 묶음은 ${size}를 사용합니다. 계속하시겠어요?`;
  return window.confirm(msg);
}

/** 급수(tier) 묶음을 받는다 — Settings 의 급수별 "받기" 버튼이 호출. */
export function bulkDownloadTier(
  tier: TtsTier,
  opts: BulkOptions = {},
): Promise<BulkResult> {
  const meta = getTtsTierMetas().find((m) => m.tier === tier);
  return runBulkDownload(tierFiles(tier), meta?.estMB ?? 0, opts);
}

async function runBulkDownload(
  files: string[],
  estMB: number,
  opts: BulkOptions,
): Promise<BulkResult> {
  const total = files.length;
  let done = 0;
  let failed = 0;
  let aborted = false;
  let index = 0;

  // 비용이 큰 회선에서는 사전 확인. Wi-Fi 에서는 무음 진행.
  const condition = detectNetworkCondition();
  if (condition !== "wifi") {
    const confirmFn =
      opts.requireExpensiveConfirm ??
      ((): Promise<boolean> =>
        Promise.resolve(defaultExpensiveConfirm(condition, estMB)));
    const ok = await confirmFn();
    if (!ok) return { done: 0, failed: 0, total, aborted: true };
  }

  if (opts.signal?.aborted) return { done: 0, failed: 0, total, aborted: true };

  // captive portal 감지 플래그 — 첫 잘못된 content-type 응답에서 set.
  let captivePortalAborted = false;

  const next = (): string | null => {
    if (opts.signal?.aborted || captivePortalAborted) {
      aborted = true;
      return null;
    }
    if (index >= files.length) return null;
    return files[index++];
  };

  const fetchOnce = async (file: string): Promise<boolean> => {
    const res = await fetch(`${TTS_BASE_URL}${file}`, {
      method: "GET",
      signal: opts.signal,
    });
    const success = res.ok || res.type === "opaque" || res.status === 206;
    // captive portal 판정 — opaque/206 이 아닌데 content-type 이 audio/* 도
    // octet-stream 도 아니면 portal HTML. 첫 응답에서 한 번만 검사.
    if (success && res.type !== "opaque" && res.status !== 206) {
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      if (ct && !ct.startsWith("audio/") && !ct.includes("octet-stream")) {
        captivePortalAborted = true;
        try {
          void res.body?.cancel().catch(() => {
            /* ignore */
          });
        } catch {
          /* ignore */
        }
        return false;
      }
    }
    try {
      // body 를 명시적으로 버려 메모리 압박 회피. SW 는 별도 자체 fetch 로
      // 응답을 가로채 캐시하므로 호출자 측 body cancel 은 캐시 적재에 영향 없다.
      void res.body?.cancel().catch(() => {
        /* ignore */
      });
    } catch {
      /* ignore */
    }
    return success;
  };

  // abort signal 에 반응하는 백오프 — 800ms 동안 abort 되면 즉시 종료.
  const abortableBackoff = (ms: number): Promise<void> => {
    if (opts.signal?.aborted) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        opts.signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = (): void => {
        clearTimeout(t);
        opts.signal?.removeEventListener("abort", onAbort);
        resolve();
      };
      opts.signal?.addEventListener("abort", onAbort, { once: true });
    });
  };

  async function worker(): Promise<void> {
    for (;;) {
      if (opts.signal?.aborted) {
        aborted = true;
        return;
      }
      const file = next();
      if (!file) return;
      let ok = false;
      try {
        ok = await fetchOnce(file);
      } catch {
        if (opts.signal?.aborted) {
          aborted = true;
          return;
        }
        ok = false;
      }
      if (captivePortalAborted) {
        failed++;
        opts.onProgress?.({ done, failed, total });
        return;
      }
      if (!ok && !opts.signal?.aborted) {
        await abortableBackoff(RETRY_BACKOFF_MS);
        if (!opts.signal?.aborted && !captivePortalAborted) {
          try {
            ok = await fetchOnce(file);
          } catch {
            if (opts.signal?.aborted) {
              aborted = true;
              return;
            }
            ok = false;
          }
        }
      }
      if (ok) done++;
      else failed++;
      opts.onProgress?.({ done, failed, total });
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, total); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return { done, failed, total, aborted: aborted || captivePortalAborted };
}
