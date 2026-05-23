import bundle from "./content-bundle.json";
import type { ContentBundle, VocabEntry, IdiomEntry, VocabGroup, IdiomGroup } from "@/types";

const data = bundle as ContentBundle;

export function getVocabGroups(): VocabGroup[] {
  return data.vocabGroups;
}

export function getIdiomGroups(): IdiomGroup[] {
  return data.idiomGroups;
}

export function getVocabById(id: string): VocabEntry | undefined {
  for (const g of data.vocabGroups) {
    const found = g.entries.find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getIdiomById(id: string): IdiomEntry | undefined {
  for (const g of data.idiomGroups) {
    const found = g.entries.find((e) => e.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getVocabGroupById(id: string): VocabGroup | undefined {
  return data.vocabGroups.find((g) => g.id === id);
}

export function getIdiomGroupById(id: string): IdiomGroup | undefined {
  return data.idiomGroups.find((g) => g.id === id);
}

export function getAllVocabEntries(): VocabEntry[] {
  return data.vocabGroups.flatMap((g) => g.entries);
}

export function getAllIdiomEntries(): IdiomEntry[] {
  return data.idiomGroups.flatMap((g) => g.entries);
}

export function getPhases() {
  return data.phases;
}
