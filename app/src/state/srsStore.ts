import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";
import { type SrsCard, type Difficulty, newCard, review, isDue } from "@/lib/srs";

type State = { cards: Record<string, SrsCard> };
type Actions = {
  addCard: (id: string, kind: "vocab" | "idiom") => void;
  removeCard: (id: string) => void;
  reviewCard: (id: string, diff: Difficulty) => void;
  dueCards: () => SrsCard[];
  total: () => number;
};

export const useSrs = create<State & Actions>()(
  persist(
    (set, get) => ({
      cards: {},
      addCard: (id, kind) =>
        set((s) => (s.cards[id] ? s : { cards: { ...s.cards, [id]: newCard(id, kind) } })),
      removeCard: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.cards;
          return { cards: rest };
        }),
      reviewCard: (id, diff) =>
        set((s) => {
          const c = s.cards[id];
          if (!c) return s;
          return { cards: { ...s.cards, [id]: review(c, diff) } };
        }),
      dueCards: () => Object.values(get().cards).filter((c) => isDue(c)),
      total: () => Object.keys(get().cards).length,
    }),
    {
      name: "chinword/srs",
      storage: createIdbStorage(),
      version: 1,
      // version 변경 시 migrate 함수가 없으면 Zustand persist는 stored state를
      // 폐기하고 초기값으로 대체한다 → 전 사용자의 SRS 진도가 무음 소거됨.
      // 항등 migrate를 두어 "버전 변경 = 의도적 판단" 임을 코드에 명시한다.
      // 향후 schema 변경 시 이 함수에서 실제 변환을 수행해야 한다.
      migrate: (state, _version) => state as State & Actions,
    },
  ),
);
