/**
 * navigator.storage.estimate() + Cache Storage 관리 헬퍼.
 * 설정 → 저장 공간 패널과 부팅 시 영구 저장소 승격에 사용.
 */

export type StorageInfo = {
  usageBytes: number;
  quotaBytes: number;
  usageMB: number;
  quotaMB: number;
  percent: number;
  supported: boolean;
};

/**
 * 영구 저장소(persistent storage) 승격을 요청한다.
 *
 * 기본(best-effort) 저장소는 iOS Safari 7일 미사용·디스크 부족 시 브라우저가
 * 학습 진도·즐겨찾기·SRS 기록을 통째로 삭제할 수 있다. persist() 가 승인되면
 * 사용자가 명시적으로 지울 때까지 보존된다. 멱등 — 이미 영구면 재요청 안 함.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.persist
  ) {
    return false;
  }
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.estimate
  ) {
    return {
      usageBytes: 0,
      quotaBytes: 0,
      usageMB: 0,
      quotaMB: 0,
      percent: 0,
      supported: false,
    };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    usageBytes: usage,
    quotaBytes: quota,
    usageMB: +(usage / 1024 / 1024).toFixed(2),
    quotaMB: +(quota / 1024 / 1024).toFixed(1),
    percent: quota > 0 ? +((usage / quota) * 100).toFixed(2) : 0,
    supported: true,
  };
}

/** SW 가 만든 모든 Cache Storage 삭제 — 오프라인 디스크 사용량 전부 해제. */
export async function clearAllCaches(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const names = await caches.keys();
  await Promise.all(names.map((n) => caches.delete(n)));
  return names.length;
}

/**
 * 다시 받을 수 있는 콘텐츠 캐시만 삭제 (앱 셸 보존).
 *
 * 대상: tts mp3 · 필순 데이터(hanzi-data). 둘 다 온라인이면 재생/표시 시점에
 * 다시 받아지므로 안전하게 비울 수 있다. precache(앱 셸)·route-chunks 는
 * 보존해 다음 로드에서 앱이 깨지지 않게 한다.
 */
export async function clearContentCaches(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const names = await caches.keys();
  const targets = names.filter(
    (n) => n.includes("tts-mp3") || n.includes("hanzi-data"),
  );
  await Promise.all(targets.map((n) => caches.delete(n)));
  return targets.length;
}

/**
 * tts-mp3 캐시에 실제 적재된 mp3 파일명(마지막 경로 세그먼트) 집합을 만든다.
 *
 * "미리 받기" 완료 상태는 settings 스토어에 영속되지만, 브라우저 용량 압박 시
 * Cache Storage 는 앱과 무관하게 일부/전체가 비워질 수 있다. 이 집합으로
 * 영속된 "완료" 플래그를 실제 캐시와 대조해 거짓 완료를 바로잡는다.
 */
export async function getCachedTtsFileSet(): Promise<Set<string>> {
  const set = new Set<string>();
  if (typeof caches === "undefined") return set;
  try {
    const names = await caches.keys();
    for (const n of names.filter((x) => x.includes("tts-mp3"))) {
      const cache = await caches.open(n);
      const reqs = await cache.keys();
      for (const req of reqs) {
        const url = req.url;
        const i = url.lastIndexOf("/");
        set.add(i >= 0 ? url.slice(i + 1) : url);
      }
    }
  } catch {
    /* ignore — 검증 실패 시 영속 상태를 그대로 둔다 */
  }
  return set;
}

/**
 * 사전녹음 tts mp3 캐시만 삭제 — "중국어 음성 미리 받기"로 받아둔 음성을
 * 비운다. 온라인이면 재생 시점에 다시 받아지므로 용량 확보용으로 안전하다.
 * @returns 삭제했으면 true
 */
export async function clearTtsCache(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  const names = await caches.keys();
  const targets = names.filter((n) => n.includes("tts-mp3"));
  await Promise.all(targets.map((n) => caches.delete(n)));
  return targets.length > 0;
}
