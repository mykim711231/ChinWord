/**
 * 사전녹음 zh mp3 일괄 다운로드 — "중국어 음성 미리 받기".
 *
 * 매니페스트의 모든 mp3 를 fetch 만 하면(응답 body 는 버린다) sw.ts 의 tts-mp3
 * CacheFirst 라우트가 가로채 캐시에 적재한다. 따라서 이 함수는 SW 캐시 워밍
 * 트리거다 — 한 번 받아두면 오프라인·비행기 모드에서도 음성이 재생된다.
 *
 * ChinWord 규모: 매니페스트 16,000+ 파일 ≈ 140MB (SMCB 의 ~5배). iOS Cache
 * Storage 한도를 넘으면 sw.ts 의 purgeOnQuotaError 가 LRU evict 하므로,
 * 용량이 빠듯한 기기에서는 들어갈 만큼만 캐시되고 나머지는 온라인 시 재요청된다.
 *
 * 동시성:
 *  - 6 worker 병렬 fetch — 모바일 회선에서도 안전. 더 높이면 일부 통신사에서
 *    소켓 제한·throttling 이 걸린다.
 *
 * 취소:
 *  - signal 로 중간 중단 — Settings 의 "중지" 버튼이 abort.
 *
 * 네트워크 보호:
 *  - 약 140MB 를 받는 대용량 작업이라, 셀룰러/Low Data Mode 또는 회선 불명(iOS
 *    Safari) 이면 사용자 확인을 받는다. Wi-Fi 면 무음 진행.
 *
 * 재시도:
 *  - 첫 fetch 실패 시 800ms 백오프 후 1회 재시도(모바일 단발성 패킷 손실 대비).
 *
 * captive portal:
 *  - 호텔/카페 Wi-Fi 가 요청을 portal HTML 로 가로채면 200 OK 처럼 보이지만
 *    body 는 mp3 가 아니다. 첫 응답 content-type 을 검사해 audio/* 가 아니면
 *    즉시 중단한다(잘못된 응답이 캐시되는 것 방지).
 */
import ttsManifest from "@/data/zh-tts-manifest.json";

const TTS_MANIFEST = ttsManifest as Record<string, string>;
const TTS_BASE_URL = `${import.meta.env.BASE_URL}tts/`;

const CONCURRENCY = 6;
const RETRY_BACKOFF_MS = 800;

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

/** 매니페스트의 고유 mp3 파일 수(키 중복 제거 후). */
export function getManifestFileCount(): number {
  return new Set(Object.values(TTS_MANIFEST)).size;
}

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

function defaultExpensiveConfirm(condition: NetCondition): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function")
    return true;
  const msg =
    condition === "cellular"
      ? "현재 셀룰러(모바일 데이터)에 연결되어 있어요. 중국어 음성을 한 번에 받으면 약 140MB가 사용됩니다. 계속하시겠어요?"
      : condition === "save-data"
        ? "데이터 절약 모드가 켜져 있어요. 한 번에 약 140MB를 받게 되는데 계속하시겠어요?"
        : "현재 회선이 Wi-Fi인지 확인할 수 없어요. 중국어 음성을 한 번에 받으면 약 140MB가 사용됩니다. 계속하시겠어요?";
  return window.confirm(msg);
}

export async function bulkDownloadAll(
  opts: BulkOptions = {},
): Promise<BulkResult> {
  const files = Array.from(new Set(Object.values(TTS_MANIFEST)));
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
        Promise.resolve(defaultExpensiveConfirm(condition)));
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
