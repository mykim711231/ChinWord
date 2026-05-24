// build-content.ts
// Doc/Markdown/Phase*/{situations,idioms}/*.md -> app/src/data/*.json
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

type Phase = "Phase01" | "Phase02" | "Phase03";

type VocabGroup = {
  id: string;
  phase: Phase;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  entries: VocabEntry[];
};

type IdiomGroup = {
  id: string;
  phase: Phase;
  title: string;
  titleZh: string;
  titlePinyin: string;
  emoji: string;
  entries: IdiomEntry[];
};

/** 그룹 ID → 이모지 매핑 (홈 그리드 표시용) */
const GROUP_EMOJI: Record<string, string> = {
  s01: "👋", s02: "👨‍👩‍👧", s03: "🚇", s04: "🍜", s05: "🛍️", s06: "🏨",
  s07: "🏥", s08: "💼", s09: "🏫", s10: "✈️", s11: "🌤️", s12: "🎨",
  s13: "📊", s14: "📑", s15: "🏦", s16: "💻", s17: "⚖️", s18: "🏘️",
  i01: "📖", i02: "🤝", i03: "🧭", i04: "⏳", i05: "💗", i06: "🏆",
  i07: "👑", i08: "💰", i09: "🌏",
};

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

/** "### 1. 你好 / Nǐ hǎo / [인사말] / 안녕하세요" → 4-tuple */
function parseEntryHeader(line: string): {
  num: number; word: string; pinyin: string; pos: string; meaning: string;
} | null {
  const m = line.match(/^###\s*(\d+)\.\s*(.+)$/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const parts = m[2].split("/").map((s) => s.trim());
  if (parts.length < 4) return null;
  const [word, pinyin, posRaw, meaning] = parts;
  const pos = posRaw.replace(/^\[|\]$/g, "").trim();
  return { num, word, pinyin, pos, meaning };
}

/** Split a markdown file into entry blocks separated by "---" */
function splitEntries(content: string): string[] {
  return content
    .split(/^---\s*$/m)
    .map((s) => s.trim())
    .filter((s) => /^###\s*\d+\./m.test(s));
}

function parseVocabFile(filePath: string, phase: Phase): VocabGroup {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
  const title = parseGroupTitle(titleLine);

  // Group id from filename like "s01_인사와_소개.md"
  const idMatch = basename(filePath).match(/^(s\d{2})/);
  const id = idMatch ? idMatch[1] : basename(filePath, ".md");

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

    entries.push({
      id: `${id}_${String(header.num).padStart(2, "0")}`,
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
    phase,
    title: title.ko,
    titleZh: title.zh,
    titlePinyin: title.pinyin,
    emoji: GROUP_EMOJI[id] ?? "📚",
    entries,
  };
}

function parseIdiomFile(filePath: string, phase: Phase): IdiomGroup {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  const titleLine = lines.find((l) => l.startsWith("# ")) ?? "";
  const title = parseGroupTitle(titleLine);

  const idMatch = basename(filePath).match(/^(i\d{2})/);
  const id = idMatch ? idMatch[1] : basename(filePath, ".md");

  const entries: IdiomEntry[] = [];
  for (const block of splitEntries(raw)) {
    const blockLines = block.split(/\r?\n/);
    const header = parseEntryHeader(blockLines[0]);
    if (!header) continue;

    let sourceText = "";
    let origin = "";
    const charBreakdown: CharBreakdown[] = [];
    const synonyms: string[] = [];
    let inChar = false;
    let inSyn = false;

    for (let i = 1; i < blockLines.length; i++) {
      const ln = blockLines[i];
      if (/^-\s*원문\s*:/.test(ln)) {
        sourceText = ln.replace(/^-\s*원문\s*:\s*/, "").trim();
        inChar = false; inSyn = false; continue;
      }
      if (/^-\s*유래\s*:/.test(ln)) {
        origin = ln.replace(/^-\s*유래\s*:\s*/, "").trim();
        inChar = false; inSyn = false; continue;
      }
      if (/^-\s*글자별\s*풀이\s*:/.test(ln)) { inChar = true; inSyn = false; continue; }
      if (/^-\s*유의어\s*:/.test(ln)) { inChar = false; inSyn = true; continue; }
      if (/^-\s/.test(ln)) { inChar = false; inSyn = false; continue; }

      if (inChar && /^\s{2,}-\s/.test(ln)) {
        // 温 (wēn): 따뜻할 온 — 데우다
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
      sourceText,
      origin,
      charBreakdown,
      synonyms,
    });
  }

  return {
    id,
    phase,
    title: title.ko,
    titleZh: title.zh,
    titlePinyin: title.pinyin,
    emoji: GROUP_EMOJI[id] ?? "📜",
    entries,
  };
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const vocabGroups: VocabGroup[] = [];
  const idiomGroups: IdiomGroup[] = [];

  for (const phase of ["Phase01", "Phase02", "Phase03"] as const) {
    const phaseDir = join(SRC_DIR, phase);
    const sitDir = join(phaseDir, "situations");
    const idiomDir = join(phaseDir, "idioms");

    for (const f of listFiles(sitDir)) vocabGroups.push(parseVocabFile(f, phase));
    for (const f of listFiles(idiomDir)) idiomGroups.push(parseIdiomFile(f, phase));
  }

  vocabGroups.sort((a, b) => a.id.localeCompare(b.id));
  idiomGroups.sort((a, b) => a.id.localeCompare(b.id));

  const buildHash = createHash("sha256")
    .update(JSON.stringify({ vocabGroups, idiomGroups }))
    .digest("hex")
    .slice(0, 12);

  writeFileSync(
    join(OUT_DIR, "vocab-groups.json"),
    JSON.stringify(vocabGroups, null, 0),
    "utf8",
  );
  writeFileSync(
    join(OUT_DIR, "idiom-groups.json"),
    JSON.stringify(idiomGroups, null, 0),
    "utf8",
  );

  // vocab-meta.json — lightweight catalog for home/list rendering
  const meta = {
    buildHash,
    vocab: vocabGroups.map((g) => ({
      id: g.id, phase: g.phase, title: g.title, titleZh: g.titleZh,
      titlePinyin: g.titlePinyin, emoji: g.emoji, count: g.entries.length,
    })),
    idioms: idiomGroups.map((g) => ({
      id: g.id, phase: g.phase, title: g.title, titleZh: g.titleZh,
      titlePinyin: g.titlePinyin, emoji: g.emoji, count: g.entries.length,
    })),
  };
  writeFileSync(join(OUT_DIR, "vocab-meta.json"), JSON.stringify(meta, null, 0), "utf8");

  // Search index
  const ms = new MiniSearch({
    fields: ["word", "pinyin", "meaning"],
    storeFields: ["id", "kind", "word", "pinyin", "meaning", "groupId", "groupTitle"],
    searchOptions: { fuzzy: 0.2, prefix: true },
  });

  const docs: Array<{
    id: string; kind: "vocab" | "idiom"; word: string; pinyin: string;
    meaning: string; groupId: string; groupTitle: string;
  }> = [];
  for (const g of vocabGroups) {
    for (const e of g.entries) {
      docs.push({
        id: e.id, kind: "vocab", word: e.word, pinyin: e.pinyin,
        meaning: e.meaning, groupId: g.id, groupTitle: g.title,
      });
    }
  }
  for (const g of idiomGroups) {
    for (const e of g.entries) {
      docs.push({
        id: e.id, kind: "idiom", word: e.word, pinyin: e.pinyin,
        meaning: e.meaning, groupId: g.id, groupTitle: g.title,
      });
    }
  }
  ms.addAll(docs);
  writeFileSync(join(OUT_DIR, "search-index.json"), JSON.stringify(ms.toJSON()), "utf8");

  // Summary
  const vocabCount = vocabGroups.reduce((s, g) => s + g.entries.length, 0);
  const idiomCount = idiomGroups.reduce((s, g) => s + g.entries.length, 0);
  // eslint-disable-next-line no-console
  console.log(
    `[build-content] hash=${buildHash} · vocab ${vocabGroups.length} groups / ${vocabCount} entries · ` +
    `idiom ${idiomGroups.length} groups / ${idiomCount} entries`,
  );
}

main();
