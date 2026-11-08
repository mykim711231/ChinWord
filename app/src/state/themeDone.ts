import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";

/** 테마 학습 완료 표시 — 완료한 테마 id 집합(영속). 미완료 처리 = 집합에서 제거. */
type State = { doneIds: Record<string, true> };
type Actions = {
  markDone: (id: string) => void;
  markUndone: (id: string) => void;
  toggleDone: (id: string) => void;
};

export const useThemeDone = create<State & Actions>()(
  persist(
    (set) => ({
      doneIds: {},
      markDone: (id) =>
        set((s) => (s.doneIds[id] ? s : { doneIds: { ...s.doneIds, [id]: true } })),
      markUndone: (id) =>
        set((s) => {
          if (!s.doneIds[id]) return s;
          const next = { ...s.doneIds };
          delete next[id];
          return { doneIds: next };
        }),
      toggleDone: (id) =>
        set((s) => {
          const next = { ...s.doneIds };
          if (next[id]) delete next[id];
          else next[id] = true;
          return { doneIds: next };
        }),
    }),
    { name: "chinword/theme-done", storage: createIdbStorage(), version: 1 },
  ),
);
