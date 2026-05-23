import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { VocabGroup, VocabEntry, IdiomGroup, IdiomEntry, CharBreakdown, Phase, ContentBundle } from "../src/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOC_ROOT = join(__dirname, "..", "..", "Doc", "Markdown");
const DATA_OUT = join(__dirname, "..", "src", "data");

interface MdVocabEntry {
  num: number;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  hanjaBreakdown: string;
  hskLevel: number;
}

interface MdIdiomEntry {
  num: number;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  sourceText: string;
  origin: string;
  charBreakdown: CharBreakdown[];
  synonyms: string[];
}

function parseHskLevel(text: string): number {
  const m = text.match(/(\d+)급/);
  return m ? parseInt(m[1]) : 0;
}

function parseMdAst(content: string) {
  const processor = unified().use(remarkParse).use(remarkGfm);
  return processor.parse(content);
}

function parseSituations(content: string, groupId: string): MdVocabEntry[] {
  const entries: MdVocabEntry[] = [];
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  let current: Partial<MdVocabEntry> | null = null;
  let mode: "none" | "hanja" = "none";

  for (const line of lines) {
    // Match entry header: ### N. word / pinyin / [pos] / meaning
    const entryMatch = line.match(/^###\s+(\d+)\.\s*(.+?)\s*\/\s*(.+?)\s*\/\s*\[(.+?)\]\s*\/\s*(.+)$/);
    if (entryMatch) {
      if (current && current.word) entries.push(current as MdVocabEntry);
      current = {
        num: parseInt(entryMatch[1]),
        word: entryMatch[2].trim(),
        pinyin: entryMatch[3].trim(),
        pos: entryMatch[4].trim(),
        meaning: entryMatch[5].trim(),
        hanjaBreakdown: "",
        hskLevel: 0,
      };
      mode = "none";
      continue;
    }

    if (!current) continue;

    if (line.match(/^-\s*한자\s*풀이\s*[:\-]/)) {
      mode = "hanja";
      const content = line.replace(/^-\s*한자\s*풀이\s*[:\-]\s*/, "").trim();
      if (content) current.hanjaBreakdown = content;
      continue;
    }

    if (mode === "hanja" && /^\s{2,}-\s/.test(line)) {
      const part = line.replace(/^\s*-\s*/, "").trim();
      if (part && current.hanjaBreakdown !== undefined) {
        current.hanjaBreakdown += (current.hanjaBreakdown ? "\n" : "") + part;
      }
      continue;
    }

    if (line.match(/^-\s*HSK\s*등급\s*[:\-]/)) {
      mode = "none";
      current.hskLevel = parseHskLevel(line);
      continue;
    }

    if (line.trim().startsWith("- ")) {
      mode = "none";
      continue;
    }

    if (line.trim().startsWith("---")) {
      mode = "none";
      continue;
    }
  }

  if (current && current.word) entries.push(current as MdVocabEntry);
  return entries;
}

function parseIdioms(content: string, groupId: string): MdIdiomEntry[] {
  const entries: MdIdiomEntry[] = [];
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  let current: Partial<MdIdiomEntry> | null = null;
  let mode: "none" | "origin" | "charBreakdown" | "synonyms" = "none";
  let charBuffer: CharBreakdown[] = [];

  for (const line of lines) {
    // Match entry header
    const entryMatch = line.match(/^###\s+(\d+)\.\s*(.+?)\s*\/\s*(.+?)\s*\/\s*\[(.+?)\]\s*\/\s*(.+)$/);
    if (entryMatch) {
      if (current && current.word) {
        if (charBuffer.length > 0) current.charBreakdown = [...charBuffer];
        entries.push(current as MdIdiomEntry);
      }
      current = {
        num: parseInt(entryMatch[1]),
        word: entryMatch[2].trim(),
        pinyin: entryMatch[3].trim(),
        pos: entryMatch[4].trim(),
        meaning: entryMatch[5].trim(),
        sourceText: "",
        origin: "",
        charBreakdown: [],
        synonyms: [],
      };
      mode = "none";
      charBuffer = [];
      continue;
    }

    if (!current) continue;

    if (line.match(/^-\s*원문\s*[:\-]/)) {
      mode = "none";
      current.sourceText = line.replace(/^-\s*원문\s*[:\-]\s*/, "").trim();
      continue;
    }

    if (line.match(/^-\s*유래\s*[:\-]/)) {
      mode = "origin";
      const content = line.replace(/^-\s*유래\s*[:\-]\s*/, "").trim();
      if (content) current.origin = content;
      continue;
    }

    if (line.match(/^-\s*글자별\s*풀이\s*[:\-]/)) {
      mode = "charBreakdown";
      charBuffer = [];
      continue;
    }

    if (line.match(/^-\s*유의어\s*[:\-]/)) {
      mode = "synonyms";
      const rest = line.replace(/^-\s*유의어\s*[:\-]\s*/, "").trim();
      if (rest) current.synonyms = [rest];
      continue;
    }

    if (mode === "origin" && line.trim().startsWith("  ")) {
      const part = line.trim();
      if (part) current.origin = (current.origin ?? "") + " " + part;
      continue;
    }

    if (mode === "charBreakdown") {
      const charMatch = line.match(/^\s*-\s*(.+?)\s*\((.+?)\)\s*:?\s*(.+)$/);
      if (charMatch) {
        charBuffer.push({
          char: charMatch[1].trim(),
          pinyin: charMatch[2].trim(),
          meaning: charMatch[3].trim(),
        });
      }
      continue;
    }

    if (mode === "synonyms") {
      const synMatch = line.match(/^\s*-\s*(.+?)\s*\((.+?)\)/);
      if (synMatch) {
        const syn = synMatch[1].trim();
        if (!current.synonyms) current.synonyms = [];
        current.synonyms.push(syn);
      }
      continue;
    }

    if (line.trim().startsWith("---") || line.match(/^-\s*[가-힣]+\s*[:\-]/)) {
      mode = "none";
      continue;
    }
  }

  if (current && current.word) {
    if (charBuffer.length > 0) current.charBreakdown = [...charBuffer];
    entries.push(current as MdIdiomEntry);
  }
  return entries;
}

function parseTitle(content: string): { title: string; titlePinyin: string } {
  const h1Match = content.match(/^#\s+(.+?)\s*\((.+?),\s*(.+?)\)/m);
  if (h1Match) {
    return { title: h1Match[1].trim(), titlePinyin: h1Match[3].trim() };
  }
  // Phase02/03 idiom format: # Korean (Chinese, Pinyin)
  const h1Alt = content.match(/^#\s+(.+)/m);
  return { title: h1Alt ? h1Alt[1].trim() : "", titlePinyin: "" };
}

function processPhase(phaseDir: string, phaseId: string, phaseLabel: string): Phase {
  const situationsDir = join(phaseDir, "situations");
  const idiomsDir = join(phaseDir, "idioms");
  const vocabGroups: VocabGroup[] = [];
  const idiomGroups: IdiomGroup[] = [];

  if (existsSync(situationsDir)) {
    for (const file of readdirSync(situationsDir).sort()) {
      if (!file.endsWith(".md")) continue;
      const content = readFileSync(join(situationsDir, file), "utf-8");
      const { title, titlePinyin } = parseTitle(content);
      const mdEntries = parseSituations(content, file.replace(".md", ""));
      const entries: VocabEntry[] = mdEntries.map((e) => ({
        id: `${file.replace(".md", "")}_${String(e.num).padStart(2, "0")}`,
        word: e.word,
        pinyin: e.pinyin,
        pos: e.pos,
        meaning: e.meaning,
        hanjaBreakdown: e.hanjaBreakdown,
        hskLevel: e.hskLevel,
      }));
      vocabGroups.push({ id: file.replace(".md", ""), title, titlePinyin, entries });
    }
  }

  if (existsSync(idiomsDir)) {
    for (const file of readdirSync(idiomsDir).sort()) {
      if (!file.endsWith(".md")) continue;
      const content = readFileSync(join(idiomsDir, file), "utf-8");
      const { title, titlePinyin } = parseTitle(content);
      const mdEntries = parseIdioms(content, file.replace(".md", ""));
      const entries: IdiomEntry[] = mdEntries.map((e) => ({
        id: `${file.replace(".md", "")}_${String(e.num).padStart(2, "0")}`,
        word: e.word,
        pinyin: e.pinyin,
        pos: e.pos,
        meaning: e.meaning,
        sourceText: e.sourceText,
        origin: e.origin.replace(/\s+/g, " ").trim(),
        charBreakdown: e.charBreakdown,
        synonyms: e.synonyms,
      }));
      idiomGroups.push({ id: file.replace(".md", ""), title, entries });
    }
  }

  return { id: phaseId, label: phaseLabel, vocabGroups, idiomGroups };
}

function main() {
  if (!existsSync(DATA_OUT)) mkdirSync(DATA_OUT, { recursive: true });

  const phases = [
    { dir: join(DOC_ROOT, "Phase01"), id: "phase01", label: "Phase 1: 기초" },
    { dir: join(DOC_ROOT, "Phase02"), id: "phase02", label: "Phase 2: 중급" },
    { dir: join(DOC_ROOT, "Phase03"), id: "phase03", label: "Phase 3: 고급·비즈니스" },
  ].filter((p) => existsSync(p.dir));

  const phaseResults = phases.map((p) => processPhase(p.dir, p.id, p.label));

  const allVocabGroups = phaseResults.flatMap((p) => p.vocabGroups);
  const allIdiomGroups = phaseResults.flatMap((p) => p.idiomGroups);

  const raw = JSON.stringify({ phases: phaseResults, vocabGroups: allVocabGroups, idiomGroups: allIdiomGroups });
  const buildHash = createHash("sha256").update(raw).digest("hex").slice(0, 8);

  const bundle: ContentBundle = {
    buildHash,
    phases: phaseResults,
    vocabGroups: allVocabGroups,
    idiomGroups: allIdiomGroups,
  };

  writeFileSync(join(DATA_OUT, "content-bundle.json"), JSON.stringify(bundle), "utf-8");
  writeFileSync(
    join(DATA_OUT, "vocab-meta.json"),
    JSON.stringify(allVocabGroups.map((g) => ({ id: g.id, title: g.title, titlePinyin: g.titlePinyin, count: g.entries.length }))),
    "utf-8"
  );

  const totalWords = allVocabGroups.reduce((s, g) => s + g.entries.length, 0);
  const totalIdioms = allIdiomGroups.reduce((s, g) => s + g.entries.length, 0);
  console.log(`[build-content] Done. ${phaseResults.length} phases, ${allVocabGroups.length} vocabGroups (${totalWords} words), ${allIdiomGroups.length} idiomGroups (${totalIdioms} idioms), hash=${buildHash}`);
}

main();
