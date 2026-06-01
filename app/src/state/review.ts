import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";

/**
 * 복습 상태 — 플래시카드에서 "몰라요"로 표시한 카드 id 집합을 영속 저장한다.
 * 이 집합은 학습(플래시카드·이어듣기·필순)의 "모름만" 필터 대상이 된다.
 *
 *  - markUnknown(id) : "몰라요" → 집합에 추가
 *  - markKnown(id)   : "알아요" → 집합에서 제거(아는 카드는 모름 덱에서 빠짐)
 *
 * 즐겨찾기(useFavorites)와 동일한 `Record<id, true>` 패턴 — toggle 대신
 * 학습 결과에 따라 추가/제거가 분리돼 있다.
 */
type State = { unknownIds: Record<string, true> };
type Actions = {
  markUnknown: (id: string) => void;
  markKnown: (id: string) => void;
  isUnknown: (id: string) => boolean;
  clearUnknown: () => void;
};

export const useReview = create<State & Actions>()(
  persist(
    (set, get) => ({
      unknownIds: {},
      markUnknown: (id) =>
        set((s) => {
          if (s.unknownIds[id]) return s;
          return { unknownIds: { ...s.unknownIds, [id]: true } };
        }),
      markKnown: (id) =>
        set((s) => {
          if (!s.unknownIds[id]) return s;
          const next = { ...s.unknownIds };
          delete next[id];
          return { unknownIds: next };
        }),
      isUnknown: (id) => !!get().unknownIds[id],
      clearUnknown: () => set({ unknownIds: {} }),
    }),
    { name: "chinword/review", storage: createIdbStorage(), version: 1 },
  ),
);
