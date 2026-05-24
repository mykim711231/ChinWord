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
