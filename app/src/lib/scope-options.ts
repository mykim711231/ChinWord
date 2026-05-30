import { hskThemesByTier, hskThemeIdioms } from "@/lib/hsk-themes";

/**
 * 학습 범위(scope) 옵션 빌더 — 이어듣기·필순·플래시카드 설정 화면 공통.
 *
 * 기존엔 Listen.tsx / Strokes.tsx / Flashcards.tsx 가 거의 동일한
 * buildScopeOptions 를 각자 복제하고 있었다(티어 라벨·개수 합산 로직 중복).
 * 단일 소스로 통합하여 테마 추가/라벨 변경 시 한 곳만 고치면 되도록 한다.
 *
 * ListenScope 와 FlashcardScope 는 구조적으로 동일하므로 여기 LearnScope 로
 * 일원화한다(구조적 타이핑으로 상호 대입 가능).
 */
export type LearnScope =
  | { kind: "all" }
  | { kind: "tier"; tier: "basic" | "mid" | "adv" | "idiom" }
  | { kind: "theme"; groupId: string }
  // legacy (backward compat with persisted state)
  | { kind: "vol"; vol: 1 | 2 | 3 }
  | { kind: "lesson"; groupId: string };

export type ScopeOption = { value: string; label: string; scope: LearnScope };

type Tier = "basic" | "mid" | "adv";

/** 한 티어(전체 헤더 + 테마들)에 대한 옵션 묶음. */
function tierOptions(tier: Tier, tierLabel: string): ScopeOption[] {
  const groups = hskThemesByTier(tier);
  const total = groups.reduce((s, g) => s + g.entries.length, 0);
  const out: ScopeOption[] = [
    {
      value: `tier-${tier}`,
      label: `── ${tierLabel} 전체 · ${total}개`,
      scope: { kind: "tier", tier },
    },
  ];
  for (const g of groups)
    out.push({
      value: `theme-${g.id}`,
      label: `    ${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });
  return out;
}

/** 고사성어 티어(전체 헤더 + 그룹들). */
function idiomTierOptions(): ScopeOption[] {
  const idioms = hskThemeIdioms();
  const total = idioms.reduce((s, g) => s + g.entries.length, 0);
  const out: ScopeOption[] = [
    {
      value: "tier-idiom",
      label: `── 고사성어 전체 · ${total}개`,
      scope: { kind: "tier", tier: "idiom" },
    },
  ];
  for (const g of idioms)
    out.push({
      value: `theme-${g.id}`,
      label: `    ${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });
  return out;
}

export type BuildScopeOptionsOpts = {
  /** "전체" 옵션 라벨 (기본 "전체"). */
  allLabel?: string;
  /** 고사성어 티어/테마 포함 여부 (기본 true). 플래시카드 단어 영역은 false. */
  includeIdiom?: boolean;
};

/**
 * 기초/중급/고급(+선택적 고사성어) 전체를 한 셀렉트에 담는 옵션 목록.
 * 이어듣기·필순(includeIdiom 기본 true) 및 플래시카드 단어 영역(false)에서 사용.
 */
export function buildScopeOptions(
  opts: BuildScopeOptionsOpts = {},
): ScopeOption[] {
  const { allLabel = "전체", includeIdiom = true } = opts;
  const out: ScopeOption[] = [
    { value: "all", label: allLabel, scope: { kind: "all" } },
    ...tierOptions("basic", "기초 (HSK 1-4)"),
    ...tierOptions("mid", "중급 (HSK 5)"),
    ...tierOptions("adv", "고급 (HSK 6-9)"),
  ];
  if (includeIdiom) out.push(...idiomTierOptions());
  return out;
}

/**
 * 성어 전용 옵션 — "전체"(tier idiom) + 각 그룹. 플래시카드 성어 영역에서 사용.
 * (들여쓰기 prefix 없이 평면 표시)
 */
export function buildIdiomScopeOptions(): ScopeOption[] {
  const idioms = hskThemeIdioms();
  const total = idioms.reduce((s, g) => s + g.entries.length, 0);
  const out: ScopeOption[] = [
    {
      value: "all",
      label: `전체 · ${total}개`,
      scope: { kind: "tier", tier: "idiom" },
    },
  ];
  for (const g of idioms)
    out.push({
      value: `theme-${g.id}`,
      label: `${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });
  return out;
}

/** scope → select value 매핑(현재 선택 표시용). */
export function scopeKey(s: LearnScope): string {
  if (s.kind === "all") return "all";
  if (s.kind === "tier") return `tier-${s.tier}`;
  if (s.kind === "theme") return `theme-${s.groupId}`;
  if (s.kind === "vol") return `vol-${s.vol}`;
  return `lesson-${s.groupId}`;
}
