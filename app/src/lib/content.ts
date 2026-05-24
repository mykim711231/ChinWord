import vocabGroups from "@/data/vocab-groups.json";
import idiomGroups from "@/data/idiom-groups.json";
import meta from "@/data/vocab-meta.json";
import type {
  ContentMeta, VocabGroup, IdiomGroup, VocabEntry, IdiomEntry, AnyEntry,
} from "@/types";

const VOCAB = vocabGroups as VocabGroup[];
const IDIOMS = idiomGroups as IdiomGroup[];
const META = meta as ContentMeta;

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
