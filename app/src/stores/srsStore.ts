import { create } from "zustand";
import type { SrsCard, SrsBox } from "@/types";

const BOX_INTERVALS: Record<SrsBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

type SrsState = {
  cards: Record<string, SrsCard>;
  addCard: (entryId: string, type: "vocab" | "idiom") => void;
  removeCard: (entryId: string) => void;
  hasCard: (entryId: string) => boolean;
  markAnswer: (entryId: string, correct: boolean) => void;
  dueCards: () => SrsCard[];
  dueCount: () => number;
  load: () => void;
  persist: () => void;
};

export const useSrsStore = create<SrsState>((set, get) => ({
  cards: {},
  addCard: (entryId, type) => {
    const card: SrsCard = {
      entryId,
      type,
      box: 1,
      nextReview: Date.now() + 24 * 60 * 60 * 1000,
      intervalDays: 1,
    };
    set((s) => ({ cards: { ...s.cards, [entryId]: card } }));
    get().persist();
  },
  removeCard: (entryId) => {
    set((s) => {
      const next = { ...s.cards };
      delete next[entryId];
      return { cards: next };
    });
    get().persist();
  },
  hasCard: (entryId) => entryId in get().cards,
  markAnswer: (entryId, correct) => {
    const card = get().cards[entryId];
    if (!card) return;
    const newBox: SrsBox = correct
      ? (Math.min(card.box + 1, 5) as SrsBox)
      : 1;
    const intervalDays = BOX_INTERVALS[newBox];
    set((s) => ({
      cards: {
        ...s.cards,
        [entryId]: {
          ...card,
          box: newBox,
          intervalDays,
          nextReview: Date.now() + intervalDays * 24 * 60 * 60 * 1000,
        },
      },
    }));
    get().persist();
  },
  dueCards: () => {
    const now = Date.now();
    return Object.values(get().cards).filter((c) => c.nextReview <= now);
  },
  dueCount: () => get().dueCards().length,
  load: () => {
    try {
      const raw = localStorage.getItem("chinvoca-srs");
      if (raw) set({ cards: JSON.parse(raw) });
    } catch { /* ignore */ }
  },
  persist: () => {
    localStorage.setItem("chinvoca-srs", JSON.stringify(get().cards));
  },
}));
