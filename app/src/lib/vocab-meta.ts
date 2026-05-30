/**
 * 단어장 메타 — 작은 JSON (~14KB) 만 import.
 *
 * Home 등 인덱스 페이지가 성어 개수·테마 개수 같은 요약 수치를 표시할 때
 * 1.7MB hsk-theme-vocab/idioms 전체를 끌어오지 않도록 분리한 layer.
 *
 * 생성: `scripts/build-content.ts` 가 vocab-meta.json 으로 출력.
 *
 * 실제 단어/성어 데이터가 필요하면 `@/lib/hsk-themes` 사용 — 그 모듈은
 * /vocab/* 라우트에서만 lazy-load 된다.
 */
import vocabMeta from "@/data/vocab-meta.json";

type ThemeMeta = { id: string; title: string; count: number };

type RawVocabMeta = {
  buildHash: string;
  hskThemes: {
    basic: ThemeMeta[];
    mid: ThemeMeta[];
    adv: ThemeMeta[];
    advEnrichmentCount: number;
    advGroups: ThemeMeta[];
    idioms: ThemeMeta[];
  };
};

const M = vocabMeta as RawVocabMeta;

/** 고사성어 전체 개수 (hsk-themes/Idioms 합산). */
export function idiomTotalCount(): number {
  return M.hskThemes.idioms.reduce((s, g) => s + g.count, 0);
}

/** 고사성어 그룹 수. */
export function idiomGroupCount(): number {
  return M.hskThemes.idioms.length;
}
