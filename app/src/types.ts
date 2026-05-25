export type Phase = "Phase01" | "Phase02" | "Phase03";

export type HanjaPart = { char: string; detail: string };

export type VocabEntry = {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  hanjaBreakdown: HanjaPart[];
  hskLevel: number;
};

export type CharBreakdown = { char: string; pinyin: string; meaning: string };

export type IdiomEntry = {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  sourceText: string;
  origin: string;
  charBreakdown: CharBreakdown[];
  synonyms: string[];
};

export type VocabGroup = {
  id: string;
  phase: Phase;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  entries: VocabEntry[];
};

export type IdiomGroup = {
  id: string;
  phase: Phase;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  entries: IdiomEntry[];
};

export type GroupMeta = {
  id: string;
  phase: Phase;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  count: number;
};

export type ContentMeta = {
  buildHash: string;
  vocab: GroupMeta[];
  idioms: GroupMeta[];
};

export type AnyEntry =
  | ({ kind: "vocab"; groupId: string } & VocabEntry)
  | ({ kind: "idiom"; groupId: string } & IdiomEntry);

/**
 * HSK 3.0 단어 — drkameleon/complete-hsk-vocabulary 추출 후 LLM 한국어 번역.
 *
 * Pipeline:
 *   1) `npm run build:hsk`             → hsk-raw.json   (English only, gitignored)
 *   2) `npm run build:hsk:translate`   → hsk-words.json (Korean meanings, committed)
 *
 * 기존 `VocabEntry` (situations/idioms) 와 분리 — HSK 단어는 hanjaBreakdown 없이
 * "급별 어휘 풀" 로 사용. 학습 화면(Flashcards/Strokes/Listen) 은 둘 다 지원.
 *
 * hskLevel: 1–7 (7 = HSK 7-9 통합 고급. drkameleon 데이터셋이 7-9 를 단일 라벨로 묶음.)
 */
export type HskEntry = {
  id: string;             // hsk_<lv>_<seq>
  word: string;           // simplified
  pinyin: string;         // tone-mark 표기
  pinyinNumeric?: string; // 검색/정렬용 (성조 번호)
  pos: string[];          // CC-CEDICT pos codes
  meaning: string;        // 한국어 의미 (LLM 번역)
  meaningEn: string;      // 영어 원문 (fallback / 검증용)
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  freqRank?: number;      // 빈도 순위 (낮을수록 흔함)
  traditional?: string;   // 번체 (간체와 다를 때만)
  radical?: string;       // 부수
};
