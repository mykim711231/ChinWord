import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";

type State = { ids: Record<string, true> };
type Actions = {
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

export const useFavorites = create<State & Actions>()(
  persist(
    (set, get) => ({
      ids: {},
      toggle: (id) =>
        set((s) => {
          const next = { ...s.ids };
          if (next[id]) delete next[id];
          else next[id] = true;
          return { ids: next };
        }),
      has: (id) => !!get().ids[id],
    }),
    { name: "chinword/favorites", storage: createIdbStorage(), version: 1 },
  ),
);
