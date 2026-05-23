export type VocabEntry = {
  id: string;
  word: string;
  pinyin: string;
  pos: string;
  meaning: string;
  hanjaBreakdown: string;
  hskLevel: number;
};

export type CharBreakdown = {
  char: string;
  pinyin: string;
  meaning: string;
};

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
  title: string;
  titlePinyin: string;
  entries: VocabEntry[];
};

export type IdiomGroup = {
  id: string;
  title: string;
  entries: IdiomEntry[];
};

export type Phase = {
  id: string;
  label: string;
  vocabGroups: VocabGroup[];
  idiomGroups: IdiomGroup[];
};

export type ContentBundle = {
  buildHash: string;
  phases: Phase[];
  vocabGroups: VocabGroup[];
  idiomGroups: IdiomGroup[];
};

// Leitner SRS box type
export type SrsBox = 1 | 2 | 3 | 4 | 5;

export type SrsCard = {
  entryId: string;
  type: "vocab" | "idiom";
  box: SrsBox;
  nextReview: number; // timestamp ms
  intervalDays: number;
};
