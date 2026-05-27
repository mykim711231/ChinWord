import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";

/**
 * 이어듣기 (Marathon Listen) — SMCB-style continuous playback settings.
 * Persisted so users land back on their last setup.
 */

export type ListenScope =
  | { kind: "all" }
  | { kind: "tier"; tier: "basic" | "mid" | "adv" | "idiom" }
  | { kind: "theme"; groupId: string }
  // legacy (backward compat with persisted state)
  | { kind: "vol"; vol: 1 | 2 | 3 }
  | { kind: "lesson"; groupId: string };

export type ListenArea = { vocab: boolean; idiom: boolean };
export type ListenDisplay = {
  hanzi: boolean;
  pinyin: boolean;
  korean: boolean;
};

type State = {
  scope: ListenScope;
  area: ListenArea;
  display: ListenDisplay;
  /** seconds between cards (이어듣기), 0.3 ~ 5.0 */
  intervalSec: number;
  /** repeat the whole queue (이어듣기), 1 ~ 10 */
  repeats: number;
  /** repeat each card N times before moving on (필순), 1 ~ 10 */
  strokeRepeats: number;
  /** 범위 끝에서 처음으로 돌아가 반복 재생 */
  loop: boolean;
  /** 무작위 순서로 재생 */
  shuffle: boolean;
};

type Actions = {
  setScope: (v: ListenScope) => void;
  setArea: (v: Partial<ListenArea>) => void;
  setDisplay: (v: Partial<ListenDisplay>) => void;
  setIntervalSec: (v: number) => void;
  setRepeats: (v: number) => void;
  setStrokeRepeats: (v: number) => void;
  setLoop: (v: boolean) => void;
  setShuffle: (v: boolean) => void;
};

export const useListen = create<State & Actions>()(
  persist(
    (set) => ({
      scope: { kind: "all" },
      area: { vocab: true, idiom: true },
      display: { hanzi: true, pinyin: true, korean: true },
      intervalSec: 1.2,
      repeats: 1,
      strokeRepeats: 1,
      loop: false,
      shuffle: false,
      setScope: (v) => set({ scope: v }),
      setArea: (v) => set((s) => ({ area: { ...s.area, ...v } })),
      setDisplay: (v) => set((s) => ({ display: { ...s.display, ...v } })),
      setIntervalSec: (v) =>
        set({ intervalSec: Math.max(0.3, Math.min(5, v)) }),
      setRepeats: (v) =>
        set({ repeats: Math.max(1, Math.min(10, Math.round(v))) }),
      setStrokeRepeats: (v) =>
        set({ strokeRepeats: Math.max(1, Math.min(10, Math.round(v))) }),
      setLoop: (v) => set({ loop: v }),
      setShuffle: (v) => set({ shuffle: v }),
    }),
    {
      name: "chinword/listen",
      storage: createIdbStorage(),
      version: 3,
      migrate: (state) => {
        const s = (state ?? {}) as Partial<State>;
        return {
          ...s,
          strokeRepeats:
            typeof s.strokeRepeats === "number" ? s.strokeRepeats : 1,
          loop: typeof s.loop === "boolean" ? s.loop : false,
          shuffle: typeof s.shuffle === "boolean" ? s.shuffle : false,
        } as State;
      },
    },
  ),
);
