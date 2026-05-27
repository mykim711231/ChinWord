/**
 * hsk-themes 데이터 접근 헬퍼.
 *
 * 데이터 소스:
 *   - hsk-theme-vocab.json   (Basic/Mid 테마별 단어 그룹, 한자 풀이 포함)
 *   - hsk-theme-idioms.json  (성어 그룹 4개, 총 200개)
 *   - hsk-enrichment.json    (Adv 6,000+ 단어의 한자 풀이 → HskEntry 보강)
 *   - hsk-adv-groups.json    (Adv 68개 빈도 배치 그룹 메타 + hskId 목록)
 *
 * build-content.ts 가 Doc/Markdown/hsk-themes/ 폴더에서 파싱하여 생성.
 */
import themeVocabData from "@/data/hsk-theme-vocab.json";
import themeIdiomsData from "@/data/hsk-theme-idioms.json";
import enrichmentData from "@/data/hsk-enrichment.json";
import advGroupsData from "@/data/hsk-adv-groups.json";
import type { VocabEntry, IdiomEntry } from "@/types";

// ─── 타입 ───

export type HskThemeTier = "basic" | "mid" | "adv";

export type HskThemeVocabGroup = {
  id: string;
  tier: HskThemeTier;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  entries: VocabEntry[];
};

export type HskThemeIdiomGroup = {
  id: string;
  title: string;
  titleZh: string;
  entries: IdiomEntry[];
};

export type HskAdvGroup = {
  id: string;
  title: string;
  count: number;
  hskIds: string[];
};

// ─── 데이터 로드 ───

const THEME_VOCAB = themeVocabData as HskThemeVocabGroup[];
const THEME_IDIOMS = themeIdiomsData as HskThemeIdiomGroup[];
const ENRICHMENT = enrichmentData as Record<string, { char: string; detail: string }[]>;
const ADV_GROUPS = advGroupsData as HskAdvGroup[];

// ─── Basic / Mid 테마 접근 ───

export function hskThemesByTier(tier: HskThemeTier): HskThemeVocabGroup[] {
  return THEME_VOCAB.filter((g) => g.tier === tier && g.entries.length > 0);
}

export function findHskThemeGroup(id: string): HskThemeVocabGroup | undefined {
  return THEME_VOCAB.find((g) => g.id === id);
}

export function allHskThemeVocab(): HskThemeVocabGroup[] {
  return THEME_VOCAB;
}

// ─── 성어 접근 ───

export function hskThemeIdioms(): HskThemeIdiomGroup[] {
  return THEME_IDIOMS;
}

export function findHskThemeIdiomGroup(id: string): HskThemeIdiomGroup | undefined {
  return THEME_IDIOMS.find((g) => g.id === id);
}

// ─── Adv 그룹 접근 ───

export function hskAdvGroups(): HskAdvGroup[] {
  return ADV_GROUPS;
}

export function findHskAdvGroup(id: string): HskAdvGroup | undefined {
  return ADV_GROUPS.find((g) => g.id === id);
}

// ─── Adv 한자풀이 enrichment ───

/**
 * HskEntry.id (hsk_6_0001 등) 에 대응하는 한자 풀이가 있으면 반환.
 * HskTier 의 AdvTier 에서 단어 상세 표시 시 사용.
 */
export function getHanjaBreakdown(
  hskId: string,
): { char: string; detail: string }[] | undefined {
  return ENRICHMENT[hskId];
}

export function enrichmentCount(): number {
  return Object.keys(ENRICHMENT).length;
}

// ─── 통계 ───

export function hskThemeStats(): {
  basicGroups: number;
  basicEntries: number;
  midGroups: number;
  midEntries: number;
  idiomGroups: number;
  idiomEntries: number;
  advGroups: number;
  advEnriched: number;
} {
  const basic = THEME_VOCAB.filter((g) => g.tier === "basic");
  const mid = THEME_VOCAB.filter((g) => g.tier === "mid");
  return {
    basicGroups: basic.length,
    basicEntries: basic.reduce((s, g) => s + g.entries.length, 0),
    midGroups: mid.length,
    midEntries: mid.reduce((s, g) => s + g.entries.length, 0),
    idiomGroups: THEME_IDIOMS.length,
    idiomEntries: THEME_IDIOMS.reduce((s, g) => s + g.entries.length, 0),
    advGroups: ADV_GROUPS.length,
    advEnriched: Object.keys(ENRICHMENT).length,
  };
}
