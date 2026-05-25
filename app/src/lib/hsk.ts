/**
 * HSK 3.0 단어 데이터 접근 헬퍼.
 *
 * 데이터 소스: `src/data/hsk-words.json` — `scripts/build-hsk.ts` 가 drkameleon
 * dataset (MIT) 에서 추출하고 `scripts/translate-hsk.ts` 가 LLM 으로 의미를 한국어
 * 화한 단일 파일.
 *
 * 약 10,969 개 엔트리 (~2.4MB JSON). Vite 가 lazy 로드된 라우트와 함께 chunk 로
 * 분리하므로 / 진입 시점에는 다운로드되지 않는다.
 *
 * UI 정책 — `meaning` (한국어) 가 비어있으면 fallback 으로 `meaningEn` 사용.
 * 호출자가 `displayMeaning(entry)` 헬퍼로 일관성 있게 표시할 수 있다.
 */
import hskWords from "@/data/hsk-words.json";
import type { HskEntry } from "@/types";

const ALL = hskWords as HskEntry[];

export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type HskLevelMeta = {
  level: HskLevel;
  label: string;        // "HSK 1급" / "HSK 7-9급 (고급)"
  shortLabel: string;   // "1급" / "7-9급"
  total: number;
  translated: number;
};

const LEVEL_LABEL: Record<HskLevel, { label: string; shortLabel: string }> = {
  1: { label: "HSK 1급",         shortLabel: "1급" },
  2: { label: "HSK 2급",         shortLabel: "2급" },
  3: { label: "HSK 3급",         shortLabel: "3급" },
  4: { label: "HSK 4급",         shortLabel: "4급" },
  5: { label: "HSK 5급",         shortLabel: "5급" },
  6: { label: "HSK 6급",         shortLabel: "6급" },
  7: { label: "HSK 7-9급 (고급)", shortLabel: "7-9급" },
};

// 모듈 로드 시 한 번만 인덱스 빌드. 호출별로 O(N) 필터링 반복하지 않도록.
const BY_LEVEL = new Map<HskLevel, HskEntry[]>();
for (const e of ALL) {
  const lv = e.hskLevel as HskLevel;
  let arr = BY_LEVEL.get(lv);
  if (!arr) {
    arr = [];
    BY_LEVEL.set(lv, arr);
  }
  arr.push(e);
}

export function hskLevels(): HskLevelMeta[] {
  const out: HskLevelMeta[] = [];
  for (const lv of [1, 2, 3, 4, 5, 6, 7] as const) {
    const arr = BY_LEVEL.get(lv) ?? [];
    out.push({
      level: lv,
      label: LEVEL_LABEL[lv].label,
      shortLabel: LEVEL_LABEL[lv].shortLabel,
      total: arr.length,
      translated: arr.filter((e) => e.meaning && e.meaning.length > 0).length,
    });
  }
  return out;
}

export function hskLevelMeta(lv: HskLevel): HskLevelMeta {
  const arr = BY_LEVEL.get(lv) ?? [];
  return {
    level: lv,
    label: LEVEL_LABEL[lv].label,
    shortLabel: LEVEL_LABEL[lv].shortLabel,
    total: arr.length,
    translated: arr.filter((e) => e.meaning && e.meaning.length > 0).length,
  };
}

export function hskWordsByLevel(lv: HskLevel): HskEntry[] {
  return BY_LEVEL.get(lv) ?? [];
}

export function findHskEntry(id: string): HskEntry | undefined {
  // 1만 건 선형탐색은 100ms 미만 — 캐싱 불필요.
  return ALL.find((e) => e.id === id);
}

/**
 * 한국어 의미가 있으면 그것을, 없으면 영어 fallback 을 반환.
 * fromFallback 플래그로 UI 가 "(영)" 같은 배지를 붙일 수 있다.
 */
export function displayMeaning(e: HskEntry): { text: string; fromFallback: boolean } {
  if (e.meaning && e.meaning.length > 0) {
    return { text: e.meaning, fromFallback: false };
  }
  return { text: e.meaningEn, fromFallback: true };
}

/** 검색 — 한자/병음/의미 (KO+EN) 전체에서 substring 매칭. */
export function searchHsk(query: string, lv?: HskLevel): HskEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const pool = lv ? hskWordsByLevel(lv) : ALL;
  return pool.filter(
    (e) =>
      e.word.includes(query) ||
      e.pinyin.toLowerCase().includes(q) ||
      e.meaning.toLowerCase().includes(q) ||
      e.meaningEn.toLowerCase().includes(q),
  );
}
