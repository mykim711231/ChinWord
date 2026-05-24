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
    { name: "chinword/srs", storage: createIdbStorage(), version: 1 },
  ),
);
