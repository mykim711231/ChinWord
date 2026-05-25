import vocabGroups from "@/data/vocab-groups.json";
import idiomGroups from "@/data/idiom-groups.json";
import meta from "@/data/vocab-meta.json";
import type {
  ContentMeta, VocabGroup, IdiomGroup, VocabEntry, IdiomEntry, AnyEntry,
  GroupMeta, Phase,
} from "@/types";

const VOCAB = vocabGroups as VocabGroup[];
const IDIOMS = idiomGroups as IdiomGroup[];
const META = meta as ContentMeta;

export type Volume = 1 | 2 | 3;

export type LessonRow = {
  vol: Volume;
  no: number;
  kind: "vocab" | "idiom";
  groupId: string;
  titleKo: string;
  titleZh: string;
  titlePinyin: string;
  count: number;
};

const PHASE_BY_VOL: Record<Volume, Phase> = {
  1: "Phase01",
  2: "Phase02",
  3: "Phase03",
};

function toRow(
  vol: Volume,
  no: number,
  kind: "vocab" | "idiom",
  g: GroupMeta,
): LessonRow {
  return {
    vol,
    no,
    kind,
    groupId: g.id,
    titleKo: g.title,
    titleZh: g.titleZh,
    titlePinyin: g.titlePinyin,
    count: g.count,
  };
}

export function lessonsByVolume(
  vol: Volume,
  kind?: "vocab" | "idiom",
): LessonRow[] {
  const phase = PHASE_BY_VOL[vol];
  const v =
    kind === "idiom"
      ? []
      : META.vocab
          .filter((g) => g.phase === phase)
          .sort((a, b) => a.id.localeCompare(b.id));
  const i =
    kind === "vocab"
      ? []
      : META.idioms
          .filter((g) => g.phase === phase)
          .sort((a, b) => a.id.localeCompare(b.id));
  const rows: LessonRow[] = [];
  let no = 1;
  for (const g of v) rows.push(toRow(vol, no++, "vocab", g));
  for (const g of i) rows.push(toRow(vol, no++, "idiom", g));
  return rows;
}

export function volumeRangeLabel(
  vol: Volume,
  kind?: "vocab" | "idiom",
): string {
  const rows = lessonsByVolume(vol, kind);
  if (rows.length === 0) return "";
  return `1~${rows.length}과`;
}

export const contentMeta = META;
export const vocabGroupsAll = VOCAB;
export const idiomGroupsAll = IDIOMS;

export function findVocabGroup(id: string): VocabGroup | undefined {
  return VOCAB.find((g) => g.id === id);
}
export function findIdiomGroup(id: string): IdiomGroup | undefined {
  return IDIOMS.find((g) => g.id === id);
}

export function findVocabEntry(id: string):
  | { entry: VocabEntry; group: VocabGroup; index: number } | undefined {
  for (const g of VOCAB) {
    const idx = g.entries.findIndex((e) => e.id === id);
    if (idx >= 0) return { entry: g.entries[idx], group: g, index: idx };
  }
  return undefined;
}

export function findIdiomEntry(id: string):
  | { entry: IdiomEntry; group: IdiomGroup; index: number } | undefined {
  for (const g of IDIOMS) {
    const idx = g.entries.findIndex((e) => e.id === id);
    if (idx >= 0) return { entry: g.entries[idx], group: g, index: idx };
  }
  return undefined;
}

export function getEntryById(id: string): AnyEntry | undefined {
  const v = findVocabEntry(id);
  if (v) return { kind: "vocab", groupId: v.group.id, ...v.entry };
  const i = findIdiomEntry(id);
  if (i) return { kind: "idiom", groupId: i.group.id, ...i.entry };
  return undefined;
}

export function allEntries(): AnyEntry[] {
  const out: AnyEntry[] = [];
  for (const g of VOCAB) for (const e of g.entries)
    out.push({ kind: "vocab", groupId: g.id, ...e });
  for (const g of IDIOMS) for (const e of g.entries)
    out.push({ kind: "idiom", groupId: g.id, ...e });
  return out;
}

/**
 * Build a flat play queue for 이어듣기 based on scope + area filters.
 * Entries are yielded in lesson order (1권.01과 → 1권.09과 → 2권.01과 …),
 * with each lesson's entries in their natural sequence.
 */
export function buildListenQueue(opts: {
  scope:
    | { kind: "all" }
    | { kind: "vol"; vol: 1 | 2 | 3 }
    | { kind: "lesson"; groupId: string };
  area: { vocab: boolean; idiom: boolean };
}): AnyEntry[] {
  const { scope, area } = opts;
  const result: AnyEntry[] = [];

  // lesson scope: direct group lookup, no volume scan needed
  if (scope.kind === "lesson") {
    const vg = findVocabGroup(scope.groupId);
    if (vg && area.vocab) {
      for (const e of vg.entries)
        result.push({ kind: "vocab", groupId: vg.id, ...e });
      return result;
    }
    const ig = findIdiomGroup(scope.groupId);
    if (ig && area.idiom) {
      for (const e of ig.entries)
        result.push({ kind: "idiom", groupId: ig.id, ...e });
    }
    return result;
  }

  const volRange: Volume[] = scope.kind === "all" ? [1, 2, 3] : [scope.vol];
  for (const vol of volRange) {
    const lessons = lessonsByVolume(vol);
    for (const l of lessons) {
      if (l.kind === "vocab" && !area.vocab) continue;
      if (l.kind === "idiom" && !area.idiom) continue;
      if (l.kind === "vocab") {
        const g = findVocabGroup(l.groupId);
        if (!g) continue;
        for (const e of g.entries)
          result.push({ kind: "vocab", groupId: g.id, ...e });
      } else {
        const g = findIdiomGroup(l.groupId);
        if (!g) continue;
        for (const e of g.entries)
          result.push({ kind: "idiom", groupId: g.id, ...e });
      }
    }
  }
  return result;
}

/**
 * Resolve the friendly title for an entry's source lesson (e.g. "인사와 소개").
 * Used by the listen player to show "하나님의 사랑 · 1/657" style header.
 */
export function lessonTitleFor(entry: AnyEntry): string {
  if (entry.kind === "vocab") return findVocabGroup(entry.groupId)?.title ?? "";
  return findIdiomGroup(entry.groupId)?.title ?? "";
}

export function randomVocab(): { entry: VocabEntry; group: VocabGroup } {
  const g = VOCAB[Math.floor(Math.random() * VOCAB.length)];
  const e = g.entries[Math.floor(Math.random() * g.entries.length)];
  return { entry: e, group: g };
}

export function randomIdiom(): { entry: IdiomEntry; group: IdiomGroup } {
  const g = IDIOMS[Math.floor(Math.random() * IDIOMS.length)];
  const e = g.entries[Math.floor(Math.random() * g.entries.length)];
  return { entry: e, group: g };
}
