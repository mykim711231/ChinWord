import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";
import type { DeckFilter } from "@/lib/deck-filter";

/**
 * 플래시카드 설정 — 단어/성어 area는 URL(`/flashcards/:area`)로 결정되고,
 * 본 store는 area-별 scope(전체/권/과)와 공통 옵션(`direction`)을 저장한다.
 */

export type FlashcardScope =
  | { kind: "all" }
  | { kind: "tier"; tier: "basic" | "mid" | "adv" | "idiom" }
  | { kind: "theme"; groupId: string }
  // legacy (backward compat with persisted state)
  | { kind: "vol"; vol: 1 | 2 | 3 }
  | { kind: "lesson"; groupId: string };

export type FlashcardDirection = "hanzi-first" | "meaning-first" | "mixed";

type State = {
  vocabScope: FlashcardScope;
  idiomScope: FlashcardScope;
  direction: FlashcardDirection;
  /** 덱 필터 — 전체 / 즐겨찾기만 / 모름만 (lib/deck-filter). */
  deckFilter: DeckFilter;
  /** 카드가 바뀌면 중국어 음성을 자동으로 1회 재생. */
  autoplay: boolean;
};

type Actions = {
  setVocabScope: (v: FlashcardScope) => void;
  setIdiomScope: (v: FlashcardScope) => void;
  setDirection: (v: FlashcardDirection) => void;
  setDeckFilter: (v: DeckFilter) => void;
  setAutoplay: (v: boolean) => void;
};

export const useFlashcards = create<State & Actions>()(
  persist(
    (set) => ({
      vocabScope: { kind: "all" },
      idiomScope: { kind: "all" },
      direction: "hanzi-first",
      deckFilter: "all",
      autoplay: true,
      setVocabScope: (v) => set({ vocabScope: v }),
      setIdiomScope: (v) => set({ idiomScope: v }),
      setDirection: (v) => set({ direction: v }),
      setDeckFilter: (v) => set({ deckFilter: v }),
      setAutoplay: (v) => set({ autoplay: v }),
    }),
    {
      name: "chinword/flashcards",
      storage: createIdbStorage(),
      version: 2,
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>;
        if (version < 2) {
          // v1 → v2: dueOnly 필드 제거
          delete s.dueOnly;
        }
        return s as State & Actions;
      },
    },
  ),
);
