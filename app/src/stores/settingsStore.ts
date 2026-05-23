import { create } from "zustand";

export type FontSize = "sm" | "md" | "lg" | "xl";
export type ThemeMode = "system" | "light" | "dark";
export type DisplayMode = "all" | "hanzi-pinyin" | "hanzi";

const FONT_SCALES: Record<FontSize, number> = {
  sm: 0.9,
  md: 1.0,
  lg: 1.2,
  xl: 1.4,
};

type SettingsState = {
  fontSize: FontSize;
  theme: ThemeMode;
  displayMode: DisplayMode;
  ttsRate: number;
  ttsGap: number;
  setFontSize: (s: FontSize) => void;
  setTheme: (t: ThemeMode) => void;
  setDisplayMode: (m: DisplayMode) => void;
  setTtsRate: (r: number) => void;
  setTtsGap: (g: number) => void;
  fontScale: () => number;
};

const stored = (() => {
  try {
    const raw = localStorage.getItem("chinvoca-settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  fontSize: stored.fontSize ?? "md",
  theme: stored.theme ?? "system",
  displayMode: stored.displayMode ?? "all",
  ttsRate: stored.ttsRate ?? 0.9,
  ttsGap: stored.ttsGap ?? 1.0,
  setFontSize: (fontSize) => {
    localStorage.setItem("chinvoca-settings", JSON.stringify({ ...get(), fontSize }));
    set({ fontSize });
  },
  setTheme: (theme) => {
    localStorage.setItem("chinvoca-settings", JSON.stringify({ ...get(), theme }));
    set({ theme });
  },
  setDisplayMode: (displayMode) => {
    localStorage.setItem("chinvoca-settings", JSON.stringify({ ...get(), displayMode }));
    set({ displayMode });
  },
  setTtsRate: (ttsRate) => {
    localStorage.setItem("chinvoca-settings", JSON.stringify({ ...get(), ttsRate }));
    set({ ttsRate });
  },
  setTtsGap: (ttsGap) => {
    localStorage.setItem("chinvoca-settings", JSON.stringify({ ...get(), ttsGap }));
    set({ ttsGap });
  },
  fontScale: () => FONT_SCALES[get().fontSize],
}));
