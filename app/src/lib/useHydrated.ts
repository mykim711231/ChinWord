import { useEffect, useState } from "react";

/**
 * zustand `persist` 스토어가 IndexedDB(비동기)에서 하이드레이션을 마쳤는지 추적.
 *
 * 재생 라우트(/listen/play, /strokes/play, /flashcards/:area/play)는 마운트 즉시
 * 영속 scope 로부터 큐를 만든다. 그러나 createIdbStorage 는 비동기이므로 첫 렌더
 * 시점엔 기본값(scope: all 등)이 적용돼, 사용자가 고른 범위가 복원되기 전에
 * "큐 없음 → 리다이렉트" 가 발동하거나 잘못된 큐가 잠깐 노출될 수 있다.
 *
 * 이 훅으로 하이드레이션 완료 전까지 렌더를 대기시켜 그 레이스를 제거한다.
 */
type PersistApi = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
};

export function useStoreHydrated(store: PersistApi): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    // 마운트 시점에 이미 끝났을 수 있음(SPA 내부 이동).
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = store.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [store]);

  return hydrated;
}
