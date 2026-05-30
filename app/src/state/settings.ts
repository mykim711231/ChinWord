import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createIdbStorage } from "@/lib/persist";
// tts.ts 는 527KB 사전녹음 매니페스트를 포함해 ~371KB 별도 청크다. settings.ts 는
// 부팅 시 즉시 로드되므로(main.tsx applySettingsToDom) 정적 import 하면 이 청크가
// 초기 차단 번들로 끌려와 첫 페인트가 느려진다. → 타입만 정적 import 하고
// 런타임 함수(provider 등록·cancelSpeak)는 동적 import 로 분리(비차단 백그라운드).
import type { VoiceMode } from "@/lib/tts";
// 타입만 정적 import — ttsBulkDownload 는 매니페스트+테마 JSON 을 끌어오므로
// 런타임 import 는 부팅 차단 번들을 키운다. 급수 키 타입만 빌려온다.
import type { TtsTier } from "@/lib/ttsBulkDownload";

export type FontScale = "sm" | "md" | "lg" | "xl";
/**
 * 화면 테마.
 *  - system : OS 설정 따름(light/dark 자동)
 *  - light  : 밝은 기본
 *  - dark   : 어두운 기본
 *  - sepia  : 눈 편한 따뜻한 종이색(라이트 계열) — 장시간 독서 피로 완화
 *  - warm   : 웜다크(다크 계열 + 청색광 제거한 따뜻한 톤) — 야간 피로 완화
 */
export type ThemeMode = "system" | "light" | "dark" | "sepia" | "warm";
export type DisplayMode = "all" | "hanzi-pinyin" | "hanzi-only";

export const FONT_SCALE_VALUE: Record<FontScale, number> = {
  sm: 0.9, md: 1.0, lg: 1.2, xl: 1.4,
};

/**
 * 사전녹음 mp3 급수별 다운로드 상태(급수마다 독립).
 *  - idle        : 시작 전
 *  - downloading : 진행 중 (done/total 참조)
 *  - done        : 그 급수 전부 캐시 성공
 *  - partial     : 일부 실패(네트워크 끊김 등) — 재시도 가능
 *  - skipped     : 사용자가 중지/취소 (Settings 에서 재시작 가능)
 */
export type TtsBulkStatus = "idle" | "downloading" | "done" | "partial" | "skipped";

/** 한 급수(기초/중급/고급/성어)의 다운로드 상태 + 진행률. */
export type TtsTierState = { status: TtsBulkStatus; done: number; total: number };

const DEFAULT_TIER_STATE: TtsTierState = { status: "idle", done: 0, total: 0 };

/** 급수별 상태 맵 — 모든 급수 idle 로 초기화. */
function defaultTtsBulkTiers(): Record<TtsTier, TtsTierState> {
  return {
    basic: { ...DEFAULT_TIER_STATE },
    mid: { ...DEFAULT_TIER_STATE },
    adv: { ...DEFAULT_TIER_STATE },
    idioms: { ...DEFAULT_TIER_STATE },
  };
}

/**
 * 청색광 차단 필터 강도(테마와 독립). 화면 전체에 따뜻한 앰버 곱연산
 * 오버레이를 덧씌워 청색 성분을 줄인다. 0=끔, 1=약, 2=중, 3=강.
 */
export type BlueLightLevel = 0 | 1 | 2 | 3;

/** 단계별 오버레이 불투명도(곱연산). 0 단계는 오버레이 자체를 끈다. */
export const BLUE_LIGHT_OPACITY: Record<BlueLightLevel, number> = {
  0: 0, 1: 0.1, 2: 0.2, 3: 0.32,
};

type State = {
  fontScale: FontScale;
  themeMode: ThemeMode;
  displayMode: DisplayMode;
  ttsRate: number;          // 0.5 ~ 1.5
  ttsGapMs: number;         // 500 ~ 3000
  voiceMode: VoiceMode;     // 'recorded'(기본) | 'device'
  ttsBulkTiers: Record<TtsTier, TtsTierState>;
  blueLight: BlueLightLevel; // 청색광 차단 필터 강도(0=끔)
  installPromptDismissedAt: number | null;
};

type Actions = {
  setFontScale: (v: FontScale) => void;
  setThemeMode: (v: ThemeMode) => void;
  setDisplayMode: (v: DisplayMode) => void;
  setTtsRate: (v: number) => void;
  setTtsGapMs: (v: number) => void;
  setVoiceMode: (v: VoiceMode) => void;
  setTtsBulkTier: (tier: TtsTier, patch: Partial<TtsTierState>) => void;
  setBlueLight: (v: BlueLightLevel) => void;
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
      ttsBulkTiers: defaultTtsBulkTiers(),
      blueLight: 0,
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
      setTtsBulkTier: (tier, patch) =>
        set((st) => ({
          ttsBulkTiers: {
            ...st.ttsBulkTiers,
            [tier]: { ...st.ttsBulkTiers[tier], ...patch },
          },
        })),
      setBlueLight: (v) => set({ blueLight: v }),
      dismissInstallPrompt: () => set({ installPromptDismissedAt: Date.now() }),
    }),
    {
      name: "chinword/settings",
      storage: createIdbStorage(),
      version: 2,
      // version 변경 시 migrate 가 없으면 Zustand persist 는 stored state 를 통째로
      // 폐기하고 초기값으로 대체한다 → 사용자가 맞춰놓은 폰트/테마/표시모드/ttsRate
      // 가 앱 업데이트마다 무음 초기화됨. srsStore·flashcards 와 동일한 항등 패턴.
      // v1→v2: 전체 일괄 다운로드(ttsBulkStatus/ttsBulkProgress) → 급수별 분할
      // (ttsBulkTiers) 로 교체. 다른 사용자 설정(폰트/테마/ttsRate 등)은 모두 보존하고
      // 폐기된 두 필드만 제거 + ttsBulkTiers 기본값을 보강한다.
      migrate: (state, _version) => {
        const s = (state ?? {}) as Record<string, unknown>;
        delete s.ttsBulkStatus;
        delete s.ttsBulkProgress;
        if (!s.ttsBulkTiers) s.ttsBulkTiers = defaultTtsBulkTiers();
        return s as State & Actions;
      },
      // 다운로드 중 앱이 종료됐다면 'downloading' 이 남아 영원히 "받는 중"으로
      // 보인다 — 재하이드레이트 시 급수별로 'skipped' 로 정규화(진행률은 보존).
      // 비동기(idb) 하이드레이션이라 콜백 시점엔 useSettings 가 정의돼 있어
      // setState 로 안전하게 갱신한다(객체 직접 변이는 전파 보장이 없음).
      onRehydrateStorage: () => (state) => {
        const tiers = state?.ttsBulkTiers;
        if (!tiers) return;
        let changed = false;
        const next = { ...tiers };
        for (const key of Object.keys(next) as TtsTier[]) {
          if (next[key]?.status === "downloading") {
            next[key] = { ...next[key], status: "skipped" };
            changed = true;
          }
        }
        if (changed) useSettings.setState({ ttsBulkTiers: next });
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

  // 테마 클래스 적용. 웜다크(warm)는 다크 계열이므로 `dark` 클래스도 함께 켜서
  // Tailwind dark: 변형(예: 한자 캔버스 배경)과 토큰 다크 의도를 그대로 쓰되,
  // 색 토큰은 tokens.css 에서 `html.theme-warmdark` 규칙(=html.dark 보다 뒤)이 덮어쓴다.
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark =
    s.themeMode === "dark" ||
    s.themeMode === "warm" ||
    (s.themeMode === "system" && sysDark);
  // 테마 클래스명은 Tailwind 내장 유틸과의 충돌을 피하려 `theme-` 접두사를 쓴다.
  // (Tailwind 가 `.sepia { filter: sepia(100%) }` 유틸을 생성하므로 클래스명을
  //  그냥 `sepia` 로 두면 페이지 전체에 사진용 sepia() 필터가 입혀져 파랑이 올리브로
  //  변색된다. SMCB 와 동일하게 theme-sepia / theme-warmdark 로 분리.)
  root.classList.toggle("dark", useDark);
  root.classList.toggle("theme-sepia", s.themeMode === "sepia");
  root.classList.toggle("theme-warmdark", s.themeMode === "warm");

  // 청색광 차단 필터 — body::after 곱연산 오버레이 불투명도(tokens.css).
  // 테마와 독립적으로 어느 배경 위에도 따뜻한 앰버 톤을 덧씌운다.
  root.style.setProperty(
    "--blue-filter-opacity",
    String(BLUE_LIGHT_OPACITY[s.blueLight] ?? 0),
  );
}
