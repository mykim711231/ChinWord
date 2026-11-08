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

const ALL: CaptionDisplay = { showZh: true, showPinyin: true, showKo: true };
const NONE: CaptionDisplay = { showZh: false, showPinyin: false, showKo: false };

/** 입력(모두) → 뜻 떠올리기 → 소리 집중 → 한자 읽기 → 회상(한글 먼저, leadMs 뒤 음성). */
export const VOCAB_PASSES: ListeningPass[] = [
  { label: "모두 표시", display: ALL },
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

export type LearnMode = "custom" | "round" | "word";

/** 재생 계획의 한 단계 — 한 단어를 한 번 들려주는 단위. */
export type LearnStep = {
  index: number;
  label: string;
  progress: string;
  display: CaptionDisplay;
  /** 음성 전 대기(ms) — 뜻을 보고 떠올릴 시간. */
  leadMs?: number;
  /** 재생 속도 배율(느리게 시작 등). */
  rateMul?: number;
  /** 음성 뒤 따라 말하기 공백을 둘지. */
  shadow?: boolean;
  /** 음성이 끝난 뒤 정답(한자·병음·뜻)을 공개할지 — 소리만 회상용. */
  revealAfter?: boolean;
};

export type PlanOptions = {
  count: number;
  /** 단어별 "모름" 여부 (index 정렬). */
  unknown: boolean[];
  chunkSize: number;
  shadow: boolean;
  slowStart: boolean;
};

export const SLOW_RATE_MUL = 0.75;

export function buildPlan(mode: LearnMode, o: PlanOptions): LearnStep[] {
  const plan: LearnStep[] = [];
  const n = o.count;

  if (mode === "round") {
    for (let pass = 0; pass < VOCAB_PASSES.length; pass++) {
      const p = VOCAB_PASSES[pass];
      for (let index = 0; index < n; index++) {
        plan.push({
          index,
          label: p.label,
          progress: `${pass + 1}/${PASS_COUNT}회`,
          display: p.display,
          leadMs: p.leadMs,
        });
      }
    }
    return plan;
  }

  if (mode === "word") {
    for (let index = 0; index < n; index++) {
      for (let pass = 0; pass < VOCAB_PASSES.length; pass++) {
        const p = VOCAB_PASSES[pass];
        plan.push({
          index,
          label: p.label,
          progress: `${pass + 1}/${PASS_COUNT}회`,
          display: p.display,
          leadMs: p.leadMs,
        });
      }
    }
    return plan;
  }

  // custom — 묶음 단위 학습 + 따라 말하기 + 속도 변화 + 회상 2회 + 모름 가중 + 누적 복습
  const size = Math.max(2, o.chunkSize);
  const chunks: number[][] = [];
  for (let i = 0; i < n; i += size) {
    chunks.push(Array.from({ length: Math.min(size, n - i) }, (_, k) => i + k));
  }
  const RECALL_KO: Omit<LearnStep, "index" | "progress" | "label"> = {
    display: { showZh: false, showPinyin: false, showKo: true },
    leadMs: 1500,
  };
  const RECALL_SOUND: Omit<LearnStep, "index" | "progress" | "label"> = {
    display: NONE,
    leadMs: 600,
    revealAfter: true,
  };
  chunks.forEach((chunk, ci) => {
    const progress = `묶음 ${ci + 1}/${chunks.length}`;
    const stages: { label: string; rest: Omit<LearnStep, "index" | "progress" | "label"> }[] = [
      {
        label: o.slowStart ? "천천히 듣고 따라 말하기" : "듣고 따라 말하기",
        rest: { display: ALL, rateMul: o.slowStart ? SLOW_RATE_MUL : 1, shadow: o.shadow },
      },
      {
        label: "한자·병음 (뜻 숨김)·따라 말하기",
        rest: { display: { showZh: true, showPinyin: true, showKo: false }, shadow: o.shadow },
      },
      { label: "병음만", rest: { display: { showZh: false, showPinyin: true, showKo: false } } },
      {
        label: "한자만·따라 말하기",
        rest: { display: { showZh: true, showPinyin: false, showKo: false }, shadow: o.shadow },
      },
      { label: "한글만 (떠올린 뒤 확인)", rest: RECALL_KO },
      { label: "소리만 듣고 뜻 떠올리기", rest: RECALL_SOUND },
    ];
    for (const st of stages) {
      for (const index of chunk) plan.push({ index, progress, label: st.label, ...st.rest });
    }
    // 모름 단어 가중 — 약한 단어는 회상 2회를 더
    const weak = chunk.filter((i) => o.unknown[i]);
    for (const index of weak) {
      plan.push({ index, progress, label: "약한 단어 추가 회상 (한글)", ...RECALL_KO });
    }
    for (const index of weak) {
      plan.push({ index, progress, label: "약한 단어 추가 회상 (소리)", ...RECALL_SOUND });
    }
  });
  // 누적 복습 — 전체를 한 번 회상 (묶음 간 간격 효과)
  if (chunks.length > 1) {
    for (let index = 0; index < n; index++) {
      plan.push({ index, progress: "전체 복습", label: "한글만 (떠올린 뒤 확인)", ...RECALL_KO });
    }
  }
  return plan;
}

export function guideText(mode: LearnMode): string {
  if (mode === "round") {
    return `${PASS_COUNT}회 학습 듣기: 모두 표시 → 한자·병음 → 병음만 → 한자만 → 한글만. 전체 단어를 한 바퀴씩 돌아 간격을 두고 반복해요.`;
  }
  if (mode === "word") {
    return `${PASS_COUNT}회 학습 듣기: 한 단어를 모두 표시 → 한자·병음 → 병음만 → 한자만 → 한글만 순으로 연달아 듣고 다음 단어로 넘어가요(발음 따라하기에 좋아요).`;
  }
  return "맞춤 학습 듣기: 단어를 묶음으로 나눠 느리게 듣고 따라 말하기 → 한자·병음 → 병음만 → 한자만 → 한글 회상 → 소리 회상 순으로 반복하고, 몰라요 단어는 회상을 더 하며, 마지막에 전체를 복습해요.";
}
