/**
 * Lightweight pinyin utilities — no external lib.
 *
 * The bundled content has whole-word pinyin (e.g. "Xièxiè", "wǒ men",
 * "míng tiān jiàn"). For per-character TTS sync we need an array of syllables
 * aligned to the hanzi. We split heuristically by:
 *   1) explicit whitespace separators (already-aligned data)
 *   2) syllable boundary detection: vowel(+optional ng/n) followed by a
 *      consonant or by another vowel-start cluster
 *
 * Heuristic accuracy is good enough for TTS (Web Speech reads syllables
 * forgivingly). When the count doesn't match `expectedCount`, we fall back
 * to whole-word pinyin to avoid misaligned audio.
 */

const TONE_TO_PLAIN: Record<string, string> = {
  ā: "a", á: "a", ǎ: "a", à: "a",
  ē: "e", é: "e", ě: "e", è: "e",
  ī: "i", í: "i", ǐ: "i", ì: "i",
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  ǖ: "u", ǘ: "u", ǚ: "u", ǜ: "u", ü: "u",
};
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function stripTones(s: string): string {
  let out = "";
  for (const ch of s) out += TONE_TO_PLAIN[ch] ?? ch;
  return out.toLowerCase();
}

/** Returns syllable boundaries inside a contiguous (no-space) pinyin run. */
function splitContiguousPinyin(run: string): string[] {
  // Walk character-by-character of the plain (tone-stripped, lowercased) form,
  // mirroring the indexes into the original run so tone marks are preserved.
  const plain = stripTones(run);
  if (!plain) return [];
  const cuts: number[] = [0];
  let inVowel = false;
  for (let i = 0; i < plain.length; i++) {
    const c = plain[i];
    const isVowel = VOWELS.has(c);

    // Transition vowel → consonant: candidate boundary AFTER the optional
    // nasal coda (n / ng).
    if (inVowel && !isVowel) {
      // include 'n' or 'ng' as coda before cutting
      if (c === "n") {
        const next = plain[i + 1];
        // distinguish coda 'n' / 'ng' from onset 'n' of next syllable:
        // if the char after n/ng is a vowel, the n/ng belongs to current syllable
        // and we cut after it; otherwise (e.g., 'nb'), still cut after n.
        if (next === "g") {
          // 'ng'
          cuts.push(i + 2);
          i += 1; // consume the 'g'
          inVowel = false;
          continue;
        }
        cuts.push(i + 1);
        inVowel = false;
        continue;
      }
      // r-colored ending (儿化) — keep r with current syllable then cut
      if (c === "r") {
        cuts.push(i + 1);
        inVowel = false;
        continue;
      }
      // bare consonant transition — cut at this consonant (starts next onset)
      cuts.push(i);
      inVowel = false;
      continue;
    }
    if (isVowel) {
      // Two vowel groups back-to-back (e.g. 'aoa' — rare). For safety, do not
      // cut on vowel→vowel; let onset/coda decide.
      inVowel = true;
    }
  }

  // Build slices from cut boundaries
  const out: string[] = [];
  for (let k = 0; k < cuts.length; k++) {
    const start = cuts[k];
    const end = k + 1 < cuts.length ? cuts[k + 1] : run.length;
    if (end > start) out.push(run.slice(start, end));
  }
  return out;
}

/**
 * 콘텐츠의 `sourceText`·`synonyms` 는 표시용으로
 *   `"温故而知新，可以为师矣 (Wēn gù ér zhī xīn) — 『논어』"`
 * 처럼 한문 + 괄호 병음 + 한국어 주석이 한 문자열로 묶여 있다.
 *
 * 그 전체를 zh-CN 신경음으로 합성하면 한자 → 병음(같은 발음 반복) → 한국어(오발음)
 * 가 되어 한 번 클릭에 두 번 발음하는 것처럼 들린다.
 *
 * 이 헬퍼는 선두의 한자/한자 문장부호/공백만 추출해 발음 대상으로 좁힌다.
 * 매니페스트 빌드(scripts/tts-texts.ts)와 런타임 lookup 이 같은 키를 만들도록
 * 두 곳에서 동일 규칙을 쓴다.
 *
 * 매칭 범위:
 *  - CJK Unified Ideographs (U+4E00–9FFF)
 *  - CJK Symbols and Punctuation (U+3000–303F: 、。〈〉《》「」『』 등)
 *  - 자주 등장하는 fullwidth 문장부호 ， 。 ： ； ！ ？ （ ） … 등
 *  - 공백
 * Latin 문자, ASCII 괄호, em/en-dash 가 나오면 그 직전에서 끊는다.
 * 한자가 전혀 없으면 trim 만 해 원문 반환.
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
 * Split a pinyin string into syllables. If `expectedCount` is given and the
 * heuristic count mismatches, returns `null` so the caller can fall back to
 * whole-word audio rather than play misaligned syllables.
 */
export function splitPinyin(
  pinyin: string,
  expectedCount?: number,
): string[] | null {
  if (!pinyin) return null;
  // Honor any explicit separators first.
  const parts = pinyin
    .split(/[\s·•·]+/)
    .flatMap((seg) => splitContiguousPinyin(seg))
    .filter(Boolean);

  if (expectedCount != null && parts.length !== expectedCount) return null;
  return parts;
}
