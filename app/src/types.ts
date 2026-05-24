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
