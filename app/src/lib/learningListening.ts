export type CaptionDisplay = {
  showZh: boolean;
  showPinyin: boolean;
  showKo: boolean;
};

export type ListeningPass = {
  label: string;
  display: CaptionDisplay;
  /** 음성 재생 전 대기(ms) — 회상 회차에서 뜻을 보고 떠올릴 시간. */
  leadMs?: number;
};

/** 입력(모두) → 뜻 떠올리기 → 소리 집중 → 한자 읽기 → 회상(한글 먼저, leadMs 뒤 음성). */
export const VOCAB_PASSES: ListeningPass[] = [
  { label: "모두 표시", display: { showZh: true, showPinyin: true, showKo: true } },
  { label: "한자·병음 (뜻 숨김)", display: { showZh: true, showPinyin: true, showKo: false } },
  { label: "병음만", display: { showZh: false, showPinyin: true, showKo: false } },
  { label: "한자만", display: { showZh: true, showPinyin: false, showKo: false } },
  {
    label: "한글만 (떠올린 뒤 확인)",
    display: { showZh: false, showPinyin: false, showKo: true },
    leadMs: 1500,
  },
];

export const PASS_COUNT = VOCAB_PASSES.length;
export const GUIDE_TEXT = `${PASS_COUNT}회 학습 듣기: 모두 표시 → 한자·병음 → 병음만 → 한자만 → 한글만(뜻을 떠올린 뒤 음성 확인).`;
