/**
 * build-hsk.ts
 *
 * drkameleon/complete-hsk-vocabulary (MIT) 를 source 로 HSK 3.0 어휘를 추출.
 * 결과를 src/data/hsk-words.json 에 직접 저장 (commit 대상).
 *
 *   Source : app/scripts/data-cache/complete-hsk.json  (9.5MB, gitignored)
 *   Output : app/src/data/hsk-words.json               (committed, 약 2.3MB)
 *
 * 한국어 의미(meaning 필드)는 별도 단계 `translate-hsk.ts` 에서 채움.
 * 이 스크립트는 결정론적이고 빠름 — API 호출 없음.
 *
 * **Resume 보호**: hsk-words.json 이 이미 존재하면 기존 한국어 번역(meaning)을
 * id 기준으로 보존. 영문/병음/메타데이터만 source 기준으로 재생성.
 * 따라서 `npm run build:hsk` 재실행이 번역 데이터를 파괴하지 않음.
 *
 * HSK 3.0 level 매핑 (drkameleon dataset):
 *   new-1 → 1   (506 단어)
 *   new-2 → 2   (750)
 *   new-3 → 3   (953)
 *   new-4 → 4   (972)
 *   new-5 → 5   (1059)
 *   new-6 → 6   (1123)
 *   new-7 → 7   (5606)  ← 데이터셋이 HSK 7-9 를 단일 라벨로 통합. 향후 분리되면
 *                          별도 처리. 현재는 "고급(7-9)" 단일 그룹.
 *
 * Source 가 없으면 자동 fetch — `npm install` 후 첫 빌드는 네트워크 필요.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import type { HskEntry } from "../src/types";

const APP_ROOT = resolve(import.meta.dirname, "..");
const CACHE_PATH = join(APP_ROOT, "scripts", "data-cache", "complete-hsk.json");
const OUT_PATH = join(APP_ROOT, "src", "data", "hsk-words.json");
// 작은 메타 파일 — Home 등 페이지가 전체 단어 데이터 (2MB) 를 불러오지 않고도
// 급별 카운트/번역 진행도를 표시할 수 있도록 분리.
const META_PATH = join(APP_ROOT, "src", "data", "hsk-meta.json");
const SOURCE_URL =
  "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/master/complete.json";

type SourceForm = {
  traditional?: string;
  transcriptions?: { pinyin?: string; numeric?: string };
  meanings?: string[];
  classifiers?: string[];
};
type SourceEntry = {
  simplified: string;
  radical?: string;
  level: string[];        // ["new-1"], ["old-3","new-2"], etc.
  frequency?: number;
  pos?: string[];
  forms?: SourceForm[];
};

async function ensureCache(): Promise<void> {
  if (existsSync(CACHE_PATH)) return;
  // 첫 빌드 — 다운로드. 9.5MB, MIT 라이선스 소스.
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`[build-hsk] Fetching source: ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Source fetch failed: HTTP ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(CACHE_PATH, buf);
  // eslint-disable-next-line no-console
  console.log(`[build-hsk] Cached ${(buf.length / 1024 / 1024).toFixed(1)}MB → ${CACHE_PATH}`);
}

/** "new-3" → 3 ; HSK 2.0 만 있는 entry 는 null. */
function pickHskLevel(levels: string[]): HskEntry["hskLevel"] | null {
  // 최저 new- 레벨 사용 (한 entry 가 여러 new- 에 있으면 가장 낮은 = 처음 등장).
  let min: number | null = null;
  for (const l of levels) {
    if (!l.startsWith("new-")) continue;
    const n = parseInt(l.slice(4), 10);
    if (!Number.isFinite(n)) continue;
    if (min === null || n < min) min = n;
  }
  if (min === null) return null;
  if (min < 1 || min > 7) return null;
  return min as HskEntry["hskLevel"];
}

/** CC-CEDICT meanings — 중복 제거 + 길이 cap. */
function joinMeanings(meanings: string[]): string {
  const uniq = Array.from(new Set(meanings.map((m) => m.trim()).filter(Boolean)));
  // 한 entry 당 10개 이상은 번역 비용 낭비 — cap.
  return uniq.slice(0, 10).join("; ");
}

async function main(): Promise<void> {
  await ensureCache();

  // eslint-disable-next-line no-console
  console.log(`[build-hsk] Reading ${CACHE_PATH}`);
  const raw: SourceEntry[] = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  // eslint-disable-next-line no-console
  console.log(`[build-hsk] Source: ${raw.length} entries (2.0 + 3.0 combined)`);

  // 기존 출력 — id → meaning 보존 맵
  const existingKo = new Map<string, string>();
  if (existsSync(OUT_PATH)) {
    try {
      const prev: HskEntry[] = JSON.parse(readFileSync(OUT_PATH, "utf8"));
      for (const e of prev) {
        if (e.meaning && e.meaning.length > 0) {
          existingKo.set(e.id, e.meaning);
        }
      }
      // eslint-disable-next-line no-console
      console.log(
        `[build-hsk] Resume: preserving ${existingKo.size} existing Korean translations`,
      );
    } catch {
      // ignore parse error — treat as no existing
    }
  }

  // 안정적 정렬: HSK level asc, frequency asc (낮은 빈도 rank = 더 흔함)
  const sorted = [...raw].sort((a, b) => {
    const la = pickHskLevel(a.level) ?? 99;
    const lb = pickHskLevel(b.level) ?? 99;
    if (la !== lb) return la - lb;
    return (a.frequency ?? 1e9) - (b.frequency ?? 1e9);
  });

  // 같은 simplified 단어가 여러 entry 로 등장하는 경우 dedupe.
  // (드물지만 dataset 에 동음이의 등으로 분리된 케이스 존재 가능.)
  const seenWord = new Set<string>();
  const filtered: HskEntry[] = [];
  const seqByLv: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  for (const e of sorted) {
    const hsk = pickHskLevel(e.level);
    if (hsk === null) continue;
    if (seenWord.has(e.simplified)) continue;
    seenWord.add(e.simplified);

    const form = e.forms?.[0];
    const meanings = form?.meanings ?? [];
    if (meanings.length === 0) continue; // 의미 없는 항목 skip

    const seq = ++seqByLv[hsk];
    const id = `hsk_${hsk}_${String(seq).padStart(4, "0")}`;
    filtered.push({
      id,
      word: e.simplified,
      pinyin: form?.transcriptions?.pinyin ?? "",
      pinyinNumeric: form?.transcriptions?.numeric,
      pos: e.pos ?? [],
      meaning: existingKo.get(id) ?? "",  // placeholder; translate-hsk.ts 가 채움
      meaningEn: joinMeanings(meanings),
      hskLevel: hsk,
      freqRank: e.frequency,
      traditional:
        form?.traditional && form.traditional !== e.simplified
          ? form.traditional
          : undefined,
      radical: e.radical,
    });
  }

  // Sanity stats
  const lvCount: Record<number, number> = {};
  let translated = 0;
  for (const e of filtered) {
    lvCount[e.hskLevel] = (lvCount[e.hskLevel] ?? 0) + 1;
    if (e.meaning) translated++;
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(filtered), "utf8");

  // 메타 파일 — Home 페이지가 가벼운 import 로 카운트만 표시할 수 있도록.
  const meta = {
    totals: lvCount as Record<string, number>,
    translated: {} as Record<string, number>,
    generatedAt: new Date().toISOString(),
  };
  for (const lv of [1, 2, 3, 4, 5, 6, 7] as const) {
    meta.translated[String(lv)] = filtered.filter(
      (e) => e.hskLevel === lv && e.meaning && e.meaning.length > 0,
    ).length;
  }
  writeFileSync(META_PATH, JSON.stringify(meta, null, 0), "utf8");

  // eslint-disable-next-line no-console
  console.log(`[build-hsk] Output: ${filtered.length} HSK 3.0 entries → ${OUT_PATH}`);
  for (const lv of [1, 2, 3, 4, 5, 6, 7] as const) {
    // eslint-disable-next-line no-console
    console.log(`  HSK ${lv}: ${lvCount[lv] ?? 0}`);
  }
  const sizeMB = (Buffer.byteLength(JSON.stringify(filtered), "utf8") / 1024 / 1024).toFixed(2);
  // eslint-disable-next-line no-console
  console.log(`  file size: ${sizeMB} MB`);
  // eslint-disable-next-line no-console
  console.log(
    `  translated (KO): ${translated}/${filtered.length} ` +
      `(${((translated / filtered.length) * 100).toFixed(1)}%) — ` +
      `run \`npm run build:hsk:translate\` to fill remaining`,
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[build-hsk] FAIL:", e);
  process.exit(1);
});
