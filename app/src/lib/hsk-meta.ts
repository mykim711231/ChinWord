/**
 * HSK 메타 — 작은 JSON (수십 bytes) 만 import.
 *
 * Home 등 인덱스 페이지가 급별 카운트/번역 진행도를 표시할 때
 * 2MB hsk-words.json 전체를 끌어오지 않도록 분리한 layer.
 *
 * 생성: `scripts/build-hsk.ts` 와 `scripts/translate-hsk.ts` 가 동기화.
 *
 * 무거운 단어 데이터가 필요하면 `@/lib/hsk` 사용 — 그 모듈은 /hsk 라우트에서만
 * lazy-load 된다.
 */
import hskMeta from "@/data/hsk-meta.json";

type RawMeta = {
  totals: Record<string, number>;
  translated: Record<string, number>;
  generatedAt: string;
};

const M = hskMeta as RawMeta;

export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const LEVEL_LABEL: Record<HskLevel, { label: string; shortLabel: string }> = {
  1: { label: "HSK 1급",         shortLabel: "1급" },
  2: { label: "HSK 2급",         shortLabel: "2급" },
  3: { label: "HSK 3급",         shortLabel: "3급" },
  4: { label: "HSK 4급",         shortLabel: "4급" },
  5: { label: "HSK 5급",         shortLabel: "5급" },
  6: { label: "HSK 6급",         shortLabel: "6급" },
  7: { label: "HSK 7-9급 (고급)", shortLabel: "7-9급" },
};

export type HskLevelSummary = {
  level: HskLevel;
  label: string;
  shortLabel: string;
  total: number;
  translated: number;
};

export function hskLevelSummaries(): HskLevelSummary[] {
  return ([1, 2, 3, 4, 5, 6, 7] as const).map((lv) => ({
    level: lv,
    label: LEVEL_LABEL[lv].label,
    shortLabel: LEVEL_LABEL[lv].shortLabel,
    total: M.totals[String(lv)] ?? 0,
    translated: M.translated[String(lv)] ?? 0,
  }));
}

export function hskTotalAll(): number {
  let sum = 0;
  for (const lv of [1, 2, 3, 4, 5, 6, 7] as const) {
    sum += M.totals[String(lv)] ?? 0;
  }
  return sum;
}

export function hskTranslatedAll(): number {
  let sum = 0;
  for (const lv of [1, 2, 3, 4, 5, 6, 7] as const) {
    sum += M.translated[String(lv)] ?? 0;
  }
  return sum;
}
