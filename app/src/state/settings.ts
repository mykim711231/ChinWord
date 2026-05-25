import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";

export type FontScale = "sm" | "md" | "lg" | "xl";
export type ThemeMode = "system" | "light" | "dark";
export type DisplayMode = "all" | "hanzi-pinyin" | "hanzi-only";

export const FONT_SCALE_VALUE: Record<FontScale, number> = {
  sm: 0.9, md: 1.0, lg: 1.2, xl: 1.4,
};

type State = {
  fontScale: FontScale;
  themeMode: ThemeMode;
  displayMode: DisplayMode;
  ttsRate: number;          // 0.5 ~ 1.5
  ttsGapMs: number;         // 500 ~ 3000
  installPromptDismissedAt: number | null;
};

type Actions = {
  setFontScale: (v: FontScale) => void;
  setThemeMode: (v: ThemeMode) => void;
  setDisplayMode: (v: DisplayMode) => void;
  setTtsRate: (v: number) => void;
  setTtsGapMs: (v: number) => void;
  dismissInstallPrompt: () => void;
};

export const useSettings = create<State & Actions>()(
  persist(
    (set) => ({
      fontScale: "md",
      themeMode: "system",
      displayMode: "all",
      ttsRate: 0.9,
      ttsGapMs: 1000,
      installPromptDismissedAt: null,
      setFontScale: (v) => set({ fontScale: v }),
      setThemeMode: (v) => set({ themeMode: v }),
      setDisplayMode: (v) => set({ displayMode: v }),
      setTtsRate: (v) => set({ ttsRate: v }),
      setTtsGapMs: (v) => set({ ttsGapMs: v }),
      dismissInstallPrompt: () => set({ installPromptDismissedAt: Date.now() }),
    }),
    {
      name: "chinword/settings",
      storage: createIdbStorage(),
      version: 1,
      // version 변경 시 migrate 가 없으면 Zustand persist 는 stored state 를 통째로
      // 폐기하고 초기값으로 대체한다 → 사용자가 맞춰놓은 폰트/테마/표시모드/ttsRate
      // 가 앱 업데이트마다 무음 초기화됨. srsStore·flashcards 와 동일한 항등 패턴.
      migrate: (state, _version) => state as State & Actions,
    },
  ),
);

/** Apply CSS variables / dark class / font-size class based on settings. */
export function applySettingsToDom() {
  const s = useSettings.getState();
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(FONT_SCALE_VALUE[s.fontScale]));

  // SMCB-style html class toggles for rem-based scaling (tokens.css).
  root.classList.toggle("fontsize-lg", s.fontScale === "lg");
  root.classList.toggle("fontsize-xl", s.fontScale === "xl");

  const useDark =
    s.themeMode === "dark" ||
    (s.themeMode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", useDark);
}
