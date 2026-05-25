import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";

/**
 * 플래시카드 설정 — 단어/성어 area는 URL(`/flashcards/:area`)로 결정되고,
 * 본 store는 area-별 scope(전체/권/과)와 공통 옵션(`dueOnly`, `direction`)을 저장한다.
 */

export type FlashcardScope =
  | { kind: "all" }
  | { kind: "vol"; vol: 1 | 2 | 3 }
  | { kind: "lesson"; groupId: string };

export type FlashcardDirection = "hanzi-first" | "meaning-first";

type State = {
  vocabScope: FlashcardScope;
  idiomScope: FlashcardScope;
  /** 복습 카드(SRS due)만 학습할지, scope 내 전체를 학습할지 */
  dueOnly: boolean;
  direction: FlashcardDirection;
};

type Actions = {
  setVocabScope: (v: FlashcardScope) => void;
  setIdiomScope: (v: FlashcardScope) => void;
  setDueOnly: (v: boolean) => void;
  setDirection: (v: FlashcardDirection) => void;
};

export const useFlashcards = create<State & Actions>()(
  persist(
    (set) => ({
      vocabScope: { kind: "all" },
      idiomScope: { kind: "all" },
      dueOnly: false,
      direction: "hanzi-first",
      setVocabScope: (v) => set({ vocabScope: v }),
      setIdiomScope: (v) => set({ idiomScope: v }),
      setDueOnly: (v) => set({ dueOnly: v }),
      setDirection: (v) => set({ direction: v }),
    }),
    {
      name: "chinword/flashcards",
      storage: createIdbStorage(),
      version: 1,
    },
  ),
);
