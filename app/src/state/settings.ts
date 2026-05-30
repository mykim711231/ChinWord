import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";
// tts.ts 는 527KB 사전녹음 매니페스트를 포함해 ~371KB 별도 청크다. settings.ts 는
// 부팅 시 즉시 로드되므로(main.tsx applySettingsToDom) 정적 import 하면 이 청크가
// 초기 차단 번들로 끌려와 첫 페인트가 느려진다. → 타입만 정적 import 하고
// 런타임 함수(provider 등록·cancelSpeak)는 동적 import 로 분리(비차단 백그라운드).
import type { VoiceMode } from "@/lib/tts";

export type FontScale = "sm" | "md" | "lg" | "xl";
export type ThemeMode = "system" | "light" | "dark";
export type DisplayMode = "all" | "hanzi-pinyin" | "hanzi-only";

export const FONT_SCALE_VALUE: Record<FontScale, number> = {
  sm: 0.9, md: 1.0, lg: 1.2, xl: 1.4,
};

/**
 * 사전녹음 mp3 일괄 다운로드 상태.
 *  - idle        : 시작 전
 *  - downloading : 진행 중 (ttsBulkProgress 참조)
 *  - done        : 전부 캐시 성공
 *  - partial     : 일부 실패(네트워크 끊김 등) — 재시도 가능
 *  - skipped     : 사용자가 중지/취소 (Settings 에서 재시작 가능)
 */
export type TtsBulkStatus = "idle" | "downloading" | "done" | "partial" | "skipped";

type State = {
  fontScale: FontScale;
  themeMode: ThemeMode;
  displayMode: DisplayMode;
  ttsRate: number;          // 0.5 ~ 1.5
  ttsGapMs: number;         // 500 ~ 3000
  voiceMode: VoiceMode;     // 'recorded'(기본) | 'device'
  ttsBulkStatus: TtsBulkStatus;
  ttsBulkProgress: { done: number; total: number };
  installPromptDismissedAt: number | null;
};

type Actions = {
  setFontScale: (v: FontScale) => void;
  setThemeMode: (v: ThemeMode) => void;
  setDisplayMode: (v: DisplayMode) => void;
  setTtsRate: (v: number) => void;
  setTtsGapMs: (v: number) => void;
  setVoiceMode: (v: VoiceMode) => void;
  setTtsBulkStatus: (v: TtsBulkStatus) => void;
  setTtsBulkProgress: (v: { done: number; total: number }) => void;
  dismissInstallPrompt: () => void;
};

export const useSettings = create<State & Actions>()(
  persist(
    (set, get) => ({
      fontScale: "md",
      themeMode: "system",
      displayMode: "all",
      ttsRate: 0.9,
      ttsGapMs: 1000,
      voiceMode: "recorded",
      ttsBulkStatus: "idle",
      ttsBulkProgress: { done: 0, total: 0 },
      installPromptDismissedAt: null,
      setFontScale: (v) => set({ fontScale: v }),
      setThemeMode: (v) => set({ themeMode: v }),
      setDisplayMode: (v) => set({ displayMode: v }),
      setTtsRate: (v) => set({ ttsRate: v }),
      setTtsGapMs: (v) => set({ ttsGapMs: v }),
      setVoiceMode: (v) => {
        // 모드 전환 시 진행 중인 발화를 즉시 종료 — 직전 utterance/audio 가
        // 새 모드와 다른 경로에서 끝나며 잘못된 컨텍스트로 콜백되는 것을 막는다.
        if (get().voiceMode !== v) {
          void import("@/lib/tts").then(({ cancelSpeak }) => cancelSpeak());
        }
        set({ voiceMode: v });
      },
      setTtsBulkStatus: (v) => set({ ttsBulkStatus: v }),
      setTtsBulkProgress: (v) => set({ ttsBulkProgress: v }),
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
      // 다운로드 중 앱이 종료됐다면 'downloading' 이 남아 영원히 "받는 중"으로
      // 보인다 — 재하이드레이트 시 'skipped' 로 정규화(진행률은 보존).
      // 비동기(idb) 하이드레이션이라 콜백 시점엔 useSettings 가 정의돼 있어
      // setState 로 안전하게 갱신한다(객체 직접 변이는 전파 보장이 없음).
      onRehydrateStorage: () => (state) => {
        if (state?.ttsBulkStatus === "downloading") {
          useSettings.setState({ ttsBulkStatus: "skipped" });
        }
      },
    },
  ),
);

// tts 모듈에 현재 재생 방식 공급 — 호출자가 opts.voiceMode 를 빠뜨려도
// speak()/speakAsync()/speakSequence* 가 사용자 설정을 강제 적용한다.
// 동적 import: 부팅 차단 번들에 tts 청크를 넣지 않으면서, 첫 발화 전에 등록.
void import("@/lib/tts").then(({ setVoiceModeProvider }) => {
  setVoiceModeProvider(() => useSettings.getState().voiceMode);
});

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
