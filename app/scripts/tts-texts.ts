/**
 * TTS 텍스트 수집 — build-tts.ts(합성)와 잠재적 검증 스크립트가
 * 공유하는 단일 진실 소스.
 *
 * 두 스크립트가 각자 수집 로직을 갖고 있으면 한쪽만 고쳐졌을 때 "검증은
 * 통과하는데 mp3 는 없는" 조용한 누락이 생긴다. 수집 규칙은 반드시
 * 이 모듈 한 곳에만 둔다.
 *
 * 적용 대상 (zh 발화 가능한 모든 텍스트):
 *   vocab-groups.json:
 *     - entry.word                     (단어 본문)
 *     - 단어를 이루는 단음절 한자       (필순 카드/한자 분해 재생)
 *   idiom-groups.json:
 *     - entry.word                     (성어 본문)
 *     - 단어를 이루는 단음절 한자       (글자별 풀이 재생)
 *     - entry.sourceText               (원문 — 출전 문장)
 *     - entry.charBreakdown[].char     (이미 위 단음절에 포함되지만 보호 차원)
 *     - entry.synonyms[]               (유의어 — 별도 zh 어구)
 *
 * meaning/pinyin/origin 등은 한국어/병음/한자혼합이라 합성 대상에서 제외.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const APP_DIR = resolve(__dirname, "..");
export const DATA_DIR = join(APP_DIR, "src", "data");
export const OUT_DIR = join(APP_DIR, "public", "tts");
export const MANIFEST_PATH = join(DATA_DIR, "zh-tts-manifest.json");

/**
 * 통용규범한자 8,105자 베이스 리스트.
 * 출처: jaywcjlove/table-of-general-standard-chinese-characters (MIT)
 *   - 国务院 2013-06 공포《通用规范汉字表》전체 (一级 3,500 + 二级 3,000 + 三级 1,605)
 *   - CJK Ext-B (𠀀~𪛟) 195자 포함 — 인명·지명·고문 전용 희귀자
 *
 * 한 줄 1자, 행수 8,105. 단음절 한자 발화 베이스라인을 제공해 콘텐츠에 없는
 * 한자도 단음절 mp3 hit 으로 신경망 발음을 들려줄 수 있게 한다.
 *
 * 사용처: collectAllTtsTexts() 가 콘텐츠 zh + 이 베이스 한자를 합집합.
 */
const COMMON_HANZI_PATH = join(
  __dirname,
  "data",
  "tongyong-guifan-hanzi-8105.txt",
);

// CJK Unified Ideographs (BMP). 확장 한자(B/C/D)는 학습 교재 범위 밖.
export const HANZI_RE = /[一-鿿]/;

type VocabEntry = {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  hanjaBreakdown: { char: string; detail: string }[];
  hskLevel: number;
};

type VocabGroup = {
  id: string;
  entries: VocabEntry[];
};

type IdiomEntry = {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  sourceText: string;
  origin: string;
  charBreakdown: { char: string; pinyin: string; meaning: string }[];
  synonyms: string[];
};

type IdiomGroup = {
  id: string;
  entries: IdiomEntry[];
};

function loadJson<T>(name: string): T {
  const p = join(DATA_DIR, name);
  if (!existsSync(p)) {
    throw new Error(
      `${name} 가 없습니다. 먼저 \`npm run build-content\` 를 실행하세요.`,
    );
  }
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

function loadJsonOptional<T>(name: string): T | null {
  const p = join(DATA_DIR, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

/** 레거시 vocab-groups (optional — 파일 없으면 빈 배열) */
export function loadVocab(): VocabGroup[] {
  return loadJsonOptional<VocabGroup[]>("vocab-groups.json") ?? [];
}

/** 레거시 idiom-groups (optional — 파일 없으면 빈 배열) */
export function loadIdioms(): IdiomGroup[] {
  return loadJsonOptional<IdiomGroup[]>("idiom-groups.json") ?? [];
}

/** hsk-theme 단어 그룹 (Basic + Mid + Adv) */
export function loadHskThemeVocab(): VocabGroup[] {
  return loadJson<VocabGroup[]>("hsk-theme-vocab.json");
}

/** hsk-theme 성어 그룹 */
export function loadHskThemeIdioms(): IdiomGroup[] {
  return loadJson<IdiomGroup[]>("hsk-theme-idioms.json");
}

/** 한 단어를 단음절 한자로 분해해 set 에 추가. */
function addCharsOf(word: string, set: Set<string>): void {
  for (const ch of word) {
    if (HANZI_RE.test(ch)) set.add(ch);
  }
}

/**
 * `sourceText`·`synonyms` 의 표시용 주석을 제거하고 한자 본문만 추출.
 * `app/src/lib/pinyin.ts#extractZhPrefix` 와 같은 규칙을 따라야 한다 —
 * 매니페스트 키와 런타임 lookup 키가 동일해야 hit 한다.
 *
 * 예: `"温故而知新，可以为师矣 (Wēn gù ér zhī xīn) — 『논어』"` → `"温故而知新，可以为师矣"`
 *
 * 합성 대상이 한자만 남아야 zh-CN 신경음이 (병음·한국어를 못 읽어) "두 번 발음하는"
 * 듯한 어색함이 사라진다.
 */
export function extractZhPrefix(s: string): string {
  if (!s) return "";
  const m = s.match(
    /^[\s　-〿一-鿿，。、；：！？（）「」『』《》〈〉【】〔〕…]+/u,
  );
  const head = m ? m[0].trim() : "";
  return head || s.trim();
}

/**
 * 통용규범한자 8,105자를 단음절 문자열 Set 으로 로드.
 * 파일이 없거나 비어있으면 빈 Set 반환 (콘텐츠 한자만으로 동작).
 *
 * 주의: CJK Ext-B 영역(예: 𠀀)은 JS string 에서 length 2 인 surrogate pair 다.
 * 한 행 전체를 "한 자"로 취급해 set 에 넣는다 — split('')/codePoint 분해 X.
 */
export function loadCommonHanzi(): Set<string> {
  if (!existsSync(COMMON_HANZI_PATH)) return new Set();
  const text = readFileSync(COMMON_HANZI_PATH, "utf8");
  const set = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (s) set.add(s);
  }
  return set;
}

/**
 * 런타임이 재생할 수 있는 모든 zh 텍스트.
 * - 콘텐츠 zh (vocab/idiom 단어, 단음절, 원문, 유의어)
 * - 통용규범한자 8,105 (베이스 한자 단음절 — 콘텐츠 외 한자 재생 보장)
 * - 매니페스트 키와 동일한 규칙으로 trim 만 적용 (lookup 시점에 추가 정규화).
 * - 빈 문자열 제거.
 */
export function collectAllTtsTexts(): Set<string> {
  const set = new Set<string>();
  for (const ch of loadCommonHanzi()) set.add(ch);

  // ── 레거시 vocab/idiom ──
  for (const g of loadVocab()) {
    for (const e of g.entries) {
      const w = e.word?.trim();
      if (!w) continue;
      set.add(w);
      addCharsOf(w, set);
    }
  }
  for (const g of loadIdioms()) {
    for (const e of g.entries) {
      const w = e.word?.trim();
      if (w) {
        set.add(w);
        addCharsOf(w, set);
      }
      // sourceText/synonyms 는 한자 + 괄호 병음 + 한국어 주석이 한 줄에 묶여 있어
      // 그대로 합성하면 신경음이 병음·한국어를 다시 읽어 "두 번 발음"하는 듯한
      // 결과가 된다. 한자 본문만 추출해 합성·인덱싱한다.
      const src = extractZhPrefix(e.sourceText ?? "");
      if (src) {
        set.add(src);
        addCharsOf(src, set);
      }
      for (const cb of e.charBreakdown ?? []) {
        const c = cb.char?.trim();
        if (c && HANZI_RE.test(c)) set.add(c);
      }
      for (const sy of e.synonyms ?? []) {
        const s = extractZhPrefix(sy);
        if (s) {
          set.add(s);
          addCharsOf(s, set);
        }
      }
    }
  }

  // ── hsk-themes vocab (Basic + Mid + Adv) ──
  for (const g of loadHskThemeVocab()) {
    for (const e of g.entries) {
      const w = e.word?.trim();
      if (!w) continue;
      set.add(w);
      addCharsOf(w, set);
    }
  }

  // ── hsk-themes idioms ──
  for (const g of loadHskThemeIdioms()) {
    for (const e of g.entries) {
      const w = e.word?.trim();
      if (w) {
        set.add(w);
        addCharsOf(w, set);
      }
      const src = extractZhPrefix(e.sourceText ?? "");
      if (src) {
        set.add(src);
        addCharsOf(src, set);
      }
      for (const cb of e.charBreakdown ?? []) {
        const c = cb.char?.trim();
        if (c && HANZI_RE.test(c)) set.add(c);
      }
      for (const sy of e.synonyms ?? []) {
        const s = extractZhPrefix(sy);
        if (s) {
          set.add(s);
          addCharsOf(s, set);
        }
      }
    }
  }

  set.delete("");
  return set;
}

export function hashName(text: string): string {
  return (
    createHash("sha1").update(text, "utf8").digest("hex").slice(0, 12) + ".mp3"
  );
}
