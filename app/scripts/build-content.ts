// build-content.ts
// Doc/Markdown/hsk-themes/{Basic,Mid,Adv,Idioms}/*.md -> app/src/data/*.json
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { createHash } from "node:crypto";
import MiniSearch from "minisearch";

const APP_ROOT = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(APP_ROOT, "..");
const SRC_DIR = join(REPO_ROOT, "Doc", "Markdown");
const OUT_DIR = join(APP_ROOT, "src", "data");

type CharBreakdown = { char: string; pinyin: string; meaning: string };

type VocabEntry = {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  hanjaBreakdown: { char: string; detail: string }[];
  hskLevel: number;
};

type IdiomEntry = {
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

/** hsk-themes 기초 테마 이모지 */
const THEME_EMOJI: Record<string, string> = {
  t01: "👋", t02: "🍜", t03: "🕐", t04: "📍", t05: "🛒",
  t06: "💊", t07: "📚", t08: "🌤️", t09: "🎨", t10: "💗",
};

type HskThemeTier = "basic" | "mid" | "adv";

/** hsk-themes tier 기본 이모지 */
const TIER_DEFAULT_EMOJI: Record<HskThemeTier, string> = {
  basic: "📚",
  mid: "📚",
  adv: "📊",
};

type HskThemeVocabGroup = {
  id: string;
  tier: HskThemeTier;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  entries: VocabEntry[];
};

type HskThemeIdiomGroup = {
  id: string;
  title: string;
  titleZh: string;
  entries: IdiomEntry[];
};

type HskAdvGroup = {
  id: string;
  title: string;
  count: number;
  hskIds: string[];
};

/** hsk-themes 파일에서 <!-- id: hsk_N_NNNN --> 추출 */
function extractHskId(block: string): string {
  const m = block.match(/<!--\s*id:\s*(hsk_\d+_\d+)\s*-->/);
  return m ? m[1] : "";
}

/** hsk-themes/Basic, Mid 파일 파싱 → HskThemeVocabGroup */
function parseHskThemeVocabFile(
  filePath: string,
  tier: HskThemeTier,
): HskThemeVocabGroup {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
  const title = parseGroupTitle(titleLine);

  const idMatch = basename(filePath).match(/^([a-z]\d{2})/);
  const fileId = idMatch ? idMatch[1] : basename(filePath, ".md");
  const id = `ht_${tier}_${fileId}`;

  const entries: VocabEntry[] = [];
  for (const block of splitEntries(raw)) {
    const blockLines = block.split(/\r?\n/);
    const header = parseEntryHeader(blockLines[0]);
    if (!header) continue;

    const hanja: { char: string; detail: string }[] = [];
    let hskLevel = 0;
    let inHanja = false;

    for (let i = 1; i < blockLines.length; i++) {
      const ln = blockLines[i];
      if (/^-\s*한자\s*풀이/.test(ln)) { inHanja = true; continue; }
      if (/^-\s*HSK\s*등급/.test(ln)) {
        inHanja = false;
        const m = ln.match(/(\d+)\s*급/);
        if (m) hskLevel = parseInt(m[1], 10);
        continue;
      }
      if (/^-\s/.test(ln)) { inHanja = false; continue; }
      if (inHanja && /^\s{2,}-\s/.test(ln)) {
        const m = ln.match(/^\s{2,}-\s*(.+?):\s*(.+)$/);
        if (m) hanja.push({ char: m[1].trim(), detail: m[2].trim() });
      }
    }

    // hsk-themes 파일은 <!-- id: hsk_N_NNNN --> 을 포함
    const hskId = extractHskId(block);
    const entryId = hskId || `${id}_${String(header.num).padStart(2, "0")}`;

    entries.push({
      id: entryId,
      word: header.word,
      pinyin: header.pinyin,
      pos: header.pos,
      meaning: header.meaning,
      hanjaBreakdown: hanja,
      hskLevel,
    });
  }

  return {
    id,
    tier,
    title: title.ko,
    titleZh: title.zh,
    titlePinyin: title.pinyin,
    emoji: THEME_EMOJI[fileId] ?? TIER_DEFAULT_EMOJI[tier] ?? "📚",
    entries,
  };
}

/** hsk-themes/Adv 파일 파싱 → {hskId → hanjaBreakdown} enrichment 맵 */
function parseHskAdvEnrichment(
  filePath: string,
): Array<{ hskId: string; hanjaBreakdown: { char: string; detail: string }[] }> {
  const raw = readFileSync(filePath, "utf8");
  const results: Array<{ hskId: string; hanjaBreakdown: { char: string; detail: string }[] }> = [];

  for (const block of splitEntries(raw)) {
    const blockLines = block.split(/\r?\n/);
    const header = parseEntryHeader(blockLines[0]);
    if (!header) continue;

    const hskId = extractHskId(block);
    if (!hskId) continue;

    const hanja: { char: string; detail: string }[] = [];
    let inHanja = false;

    for (let i = 1; i < blockLines.length; i++) {
      const ln = blockLines[i];
      if (/^-\s*한자\s*풀이/.test(ln)) { inHanja = true; continue; }
      if (/^-\s/.test(ln)) { inHanja = false; continue; }
      if (inHanja && /^\s{2,}-\s/.test(ln)) {
        const m = ln.match(/^\s{2,}-\s*(.+?):\s*(.+)$/);
        if (m) hanja.push({ char: m[1].trim(), detail: m[2].trim() });
      }
    }

    if (hanja.length > 0) {
      results.push({ hskId, hanjaBreakdown: hanja });
    }
  }

  return results;
}

/** hsk-themes/Adv 파일에서 그룹 메타데이터 (제목 + hskId 목록) 추출 */
function parseHskAdvGroup(filePath: string): HskAdvGroup {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  // 제목: "# 상위 1–100위 (HSK 6-7급)" 등
  const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
  const title = titleLine.replace(/^#\s*/, "").trim();

  // 파일 ID: d01, d02, ...
  const idMatch = basename(filePath).match(/^(d\d{2})/);
  const fileId = idMatch ? idMatch[1] : basename(filePath, ".md");
  const id = `ht_adv_${fileId}`;

  // hskId 목록 추출
  const hskIds: string[] = [];
  for (const block of splitEntries(raw)) {
    const hskId = extractHskId(block);
    if (hskId) hskIds.push(hskId);
  }

  return { id, title, count: hskIds.length, hskIds };
}

/** hsk-themes/Idioms 파일 파싱 → HskThemeIdiomGroup */
function parseHskThemeIdiomFile(filePath: string): HskThemeIdiomGroup {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
  const title = parseGroupTitle(titleLine);

  const idMatch = basename(filePath).match(/^(i\d{2})/);
  const fileId = idMatch ? idMatch[1] : basename(filePath, ".md");
  const id = `ht_idiom_${fileId}`;

  const entries: IdiomEntry[] = [];
  for (const block of splitEntries(raw)) {
    const blockLines = block.split(/\r?\n/);
    const header = parseEntryHeader(blockLines[0]);
    if (!header) continue;

    let description = "";   // 의미
    const charBreakdown: CharBreakdown[] = [];
    const synonyms: string[] = [];
    let inChar = false;
    let inSyn = false;

    for (let i = 1; i < blockLines.length; i++) {
      const ln = blockLines[i];
      if (/^-\s*의미\s*:/.test(ln)) {
        description = ln.replace(/^-\s*의미\s*:\s*/, "").trim();
        inChar = false; inSyn = false; continue;
      }
      if (/^-\s*글자별\s*풀이\s*:/.test(ln)) { inChar = true; inSyn = false; continue; }
      if (/^-\s*유의어\s*:/.test(ln)) { inChar = false; inSyn = true; continue; }
      if (/^-\s/.test(ln)) { inChar = false; inSyn = false; continue; }

      if (inChar && /^\s{2,}-\s/.test(ln)) {
        const m = ln.match(/^\s{2,}-\s*(\S+?)\s*\(([^)]+)\)\s*:\s*(.+)$/);
        if (m) {
          charBreakdown.push({
            char: m[1].trim(),
            pinyin: m[2].trim(),
            meaning: m[3].trim(),
          });
        }
      } else if (inSyn && /^\s{2,}-\s/.test(ln)) {
        synonyms.push(ln.replace(/^\s{2,}-\s*/, "").trim());
      }
    }

    entries.push({
      id: `${id}_${String(header.num).padStart(2, "0")}`,
      word: header.word,
      pinyin: header.pinyin,
      pos: header.pos,
      meaning: header.meaning,
      sourceText: "",      // hsk-themes idioms 는 "원문" 없음
      origin: description, // "의미" → origin 필드에 저장 (UI에서 "의미"로 표시)
      charBreakdown,
      synonyms,
    });
  }

  return {
    id,
    title: title.ko || `4자성어 ${fileId.replace("i", "")}`,
    titleZh: title.zh,
    entries,
  };
}

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...listFiles(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** "# 인사와 소개 (问候与介绍, Wènhòu yǔ jièshào)" → {ko, zh, pinyin} */
function parseGroupTitle(line: string): { ko: string; zh: string; pinyin: string } {
  const stripped = line.replace(/^#\s*/, "").trim();
  const m = stripped.match(/^(.+?)\s*\((.+?),\s*(.+?)\)\s*$/);
  if (m) return { ko: m[1].trim(), zh: m[2].trim(), pinyin: m[3].trim() };
  return { ko: stripped, zh: "", pinyin: "" };
}

/**
 * "### 1. 你好 / Nǐ hǎo / [인사말] / 안녕하세요" → 4-tuple
 *
 * 필드 구분자는 ` / ` (공백-슬래시-공백, 양쪽 공백 필수). 이렇게 명시적으로 매칭해야
 * `/` 가 필드 내부에 등장하는 두 케이스가 안전하게 처리된다:
 *   - POS 다품사 표기 `[명사/동사]` — `/` 양쪽에 공백 없음
 *   - 의미 내 분수/대안 `마오(1/10위안)`, `배치/스케줄(하다)` — `/` 양쪽에 공백 없음
 *
 * 이전 구현(`m[2].split("/")`)은 모든 `/` 를 잘라 POS=`[명사`, meaning=`동사]` 처럼
 * 잘못 파싱했으며 vocab-groups.json 의 31+ 엔트리가 손상되어 있었음.
 */
function parseEntryHeader(line: string): {
  num: number; word: string; pinyin: string; pos: string; meaning: string;
} | null {
  const m = line.match(/^###\s*(\d+)\.\s*(.+)$/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  // 1: word, 2: pinyin, 3: POS (브라켓 내부, `/` 허용), 4: meaning (남은 전체, `/` 허용)
  const m2 = m[2].match(/^(.+?)\s+\/\s+(.+?)\s+\/\s+\[([^\]]*)\]\s+\/\s+(.+)$/);
  if (!m2) return null;
  return {
    num,
    word: m2[1].trim(),
    pinyin: m2[2].trim(),
    pos: m2[3].trim(),
    meaning: m2[4].trim(),
  };
}

/** Split a markdown file into entry blocks separated by "---" */
function splitEntries(content: string): string[] {
  return content
    .split(/^---\s*$/m)
    .map((s) => s.trim())
    .filter((s) => /^###\s*\d+\./m.test(s));
}

function safeListFiles(dir: string): string[] {
  try { return listFiles(dir); } catch { return []; }
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // ─── 1) hsk-themes 파싱 (Basic / Mid / Adv / Idioms) ───
  const hskThemeRoot = join(SRC_DIR, "hsk-themes");

  // 2-a) Basic + Mid → HskThemeVocabGroup[]
  const hskThemeVocab: HskThemeVocabGroup[] = [];
  for (const f of safeListFiles(join(hskThemeRoot, "Basic"))) {
    hskThemeVocab.push(parseHskThemeVocabFile(f, "basic"));
  }
  for (const f of safeListFiles(join(hskThemeRoot, "Mid"))) {
    hskThemeVocab.push(parseHskThemeVocabFile(f, "mid"));
  }
  hskThemeVocab.sort((a, b) => a.id.localeCompare(b.id));

  // 2-b) Adv → enrichment map + group metadata + VocabEntry format
  const hskEnrichment: Record<string, { char: string; detail: string }[]> = {};
  const hskAdvGroups: HskAdvGroup[] = [];
  for (const f of safeListFiles(join(hskThemeRoot, "Adv"))) {
    // enrichment (한자풀이 맵) — "전체 보기" HskRow 에서 계속 사용
    for (const item of parseHskAdvEnrichment(f)) {
      hskEnrichment[item.hskId] = item.hanjaBreakdown;
    }
    // group metadata (hskIds) — "전체 보기" 에서 HskEntry 필터 용
    const group = parseHskAdvGroup(f);
    if (group.count > 0) hskAdvGroups.push(group);
    // VocabEntry format — 그룹 상세 VocabEntrySection 뷰용
    hskThemeVocab.push(parseHskThemeVocabFile(f, "adv"));
  }
  hskAdvGroups.sort((a, b) => a.id.localeCompare(b.id));

  // 2-c) Idioms → HskThemeIdiomGroup[]
  const hskThemeIdioms: HskThemeIdiomGroup[] = [];
  for (const f of safeListFiles(join(hskThemeRoot, "Idioms"))) {
    hskThemeIdioms.push(parseHskThemeIdiomFile(f));
  }
  hskThemeIdioms.sort((a, b) => a.id.localeCompare(b.id));

  // ─── 3) JSON 출력 ───
  const buildHash = createHash("sha256")
    .update(JSON.stringify({ hskThemeVocab, hskThemeIdioms, hskEnrichment, hskAdvGroups }))
    .digest("hex")
    .slice(0, 12);

  // hsk-themes 출력
  writeFileSync(
    join(OUT_DIR, "hsk-theme-vocab.json"),
    JSON.stringify(hskThemeVocab, null, 0),
    "utf8",
  );
  writeFileSync(
    join(OUT_DIR, "hsk-theme-idioms.json"),
    JSON.stringify(hskThemeIdioms, null, 0),
    "utf8",
  );
  writeFileSync(
    join(OUT_DIR, "hsk-enrichment.json"),
    JSON.stringify(hskEnrichment, null, 0),
    "utf8",
  );
  writeFileSync(
    join(OUT_DIR, "hsk-adv-groups.json"),
    JSON.stringify(hskAdvGroups, null, 0),
    "utf8",
  );

  // vocab-meta.json — hsk-themes 메타
  const meta = {
    buildHash,
    hskThemes: {
      basic: hskThemeVocab
        .filter((g) => g.tier === "basic")
        .map((g) => ({
          id: g.id, tier: g.tier, title: g.title, titleZh: g.titleZh,
          emoji: g.emoji, count: g.entries.length,
        })),
      mid: hskThemeVocab
        .filter((g) => g.tier === "mid")
        .map((g) => ({
          id: g.id, tier: g.tier, title: g.title, titleZh: g.titleZh,
          emoji: g.emoji, count: g.entries.length,
        })),
      adv: hskThemeVocab
        .filter((g) => g.tier === "adv")
        .map((g) => ({
          id: g.id, tier: g.tier, title: g.title, count: g.entries.length,
        })),
      advEnrichmentCount: Object.keys(hskEnrichment).length,
      advGroups: hskAdvGroups.map((g) => ({
        id: g.id, title: g.title, count: g.count,
      })),
      idioms: hskThemeIdioms.map((g) => ({
        id: g.id, title: g.title, count: g.entries.length,
      })),
    },
  };
  writeFileSync(join(OUT_DIR, "vocab-meta.json"), JSON.stringify(meta, null, 0), "utf8");

  // Search index — 기존 + hsk-themes 통합
  const ms = new MiniSearch({
    fields: ["word", "pinyin", "meaning"],
    storeFields: ["id", "kind", "word", "pinyin", "meaning", "groupId", "groupTitle"],
    searchOptions: { fuzzy: 0.2, prefix: true },
  });

  const docs: Array<{
    id: string; kind: "vocab" | "idiom"; word: string; pinyin: string;
    meaning: string; groupId: string; groupTitle: string;
  }> = [];
  const seenIds = new Set<string>();
  for (const g of hskThemeVocab) {
    for (const e of g.entries) {
      const docId = e.id.startsWith("hsk_") ? `ht_${e.id}` : e.id;
      if (seenIds.has(docId)) continue;
      seenIds.add(docId);
      docs.push({
        id: docId, kind: "vocab", word: e.word, pinyin: e.pinyin,
        meaning: e.meaning, groupId: g.id, groupTitle: g.title,
      });
    }
  }
  for (const g of hskThemeIdioms) {
    for (const e of g.entries) {
      if (seenIds.has(e.id)) continue;
      seenIds.add(e.id);
      docs.push({
        id: e.id, kind: "idiom", word: e.word, pinyin: e.pinyin,
        meaning: e.meaning, groupId: g.id, groupTitle: g.title,
      });
    }
  }
  ms.addAll(docs);
  writeFileSync(join(OUT_DIR, "search-index.json"), JSON.stringify(ms.toJSON()), "utf8");

  // Summary
  const htVocabCount = hskThemeVocab.reduce((s, g) => s + g.entries.length, 0);
  const htIdiomCount = hskThemeIdioms.reduce((s, g) => s + g.entries.length, 0);
  const enrichCount = Object.keys(hskEnrichment).length;
  // eslint-disable-next-line no-console
  console.log(
    `[build-content] hash=${buildHash}\n` +
    `  hsk-themes Vocab (Basic+Mid+Adv): ${hskThemeVocab.length} groups / ${htVocabCount} entries\n` +
    `  hsk-themes Idioms: ${hskThemeIdioms.length} groups / ${htIdiomCount} entries\n` +
    `  hsk-themes Adv enrichment: ${hskAdvGroups.length} groups / ${enrichCount} entries with 한자풀이\n` +
    `  search index: ${docs.length} documents`,
  );
}

main();
