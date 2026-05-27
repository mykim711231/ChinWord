/**
 * 콘텐츠 접근 레이어 — hsk-themes 전용.
 *
 * 모든 단어(VocabEntry)와 성어(IdiomEntry)는 hsk-themes 데이터에서 조회한다.
 * 레거시 vocab-groups.json / idiom-groups.json 의존성 제거됨.
 */
import type {
  VocabEntry, IdiomEntry, AnyEntry,
} from "@/types";
import {
  hskThemesByTier,
  findHskThemeGroup,
  hskThemeIdioms,
  findHskThemeIdiomGroup,
  allHskThemeVocab,
  type HskThemeTier,
  type HskThemeVocabGroup,
  type HskThemeIdiomGroup,
} from "@/lib/hsk-themes";

// ─── 단어 조회 ───

export function findVocabEntry(id: string):
  | { entry: VocabEntry; group: HskThemeVocabGroup; index: number } | undefined {
  for (const g of allHskThemeVocab()) {
    const idx = g.entries.findIndex((e) => e.id === id);
    if (idx >= 0) return { entry: g.entries[idx], group: g, index: idx };
  }
  return undefined;
}

export function findIdiomEntry(id: string):
  | { entry: IdiomEntry; group: HskThemeIdiomGroup; index: number } | undefined {
  for (const g of hskThemeIdioms()) {
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
  for (const g of allHskThemeVocab())
    for (const e of g.entries)
      out.push({ kind: "vocab", groupId: g.id, ...e });
  for (const g of hskThemeIdioms())
    for (const e of g.entries)
      out.push({ kind: "idiom", groupId: g.id, ...e });
  return out;
}

// ─── 랜덤 ───

export function randomVocab(): { entry: VocabEntry; group: HskThemeVocabGroup } {
  const groups = allHskThemeVocab().filter((g) => g.entries.length > 0);
  const g = groups[Math.floor(Math.random() * groups.length)];
  const e = g.entries[Math.floor(Math.random() * g.entries.length)];
  return { entry: e, group: g };
}

export function randomIdiom(): { entry: IdiomEntry; group: HskThemeIdiomGroup } {
  const groups = hskThemeIdioms().filter((g) => g.entries.length > 0);
  const g = groups[Math.floor(Math.random() * groups.length)];
  const e = g.entries[Math.floor(Math.random() * g.entries.length)];
  return { entry: e, group: g };
}

// ─── 이어듣기/필순/플래시카드 큐 빌더 ───

/**
 * Build a flat play queue based on scope + area filters.
 *
 * Scope kinds:
 *   "all"    — hsk-themes 전체 (basic+mid+adv+idiom)
 *   "tier"   — 특정 HSK 티어 전체 (basic / mid / adv / idiom)
 *   "theme"  — 개별 hsk-theme 그룹
 *   "vol"    — 레거시 (무시 → 빈 배열)
 *   "lesson" — 레거시 (무시 → 빈 배열)
 */
export function buildListenQueue(opts: {
  scope:
    | { kind: "all" }
    | { kind: "tier"; tier: "basic" | "mid" | "adv" | "idiom" }
    | { kind: "theme"; groupId: string }
    | { kind: "vol"; vol: 1 | 2 | 3 }
    | { kind: "lesson"; groupId: string };
  area: { vocab: boolean; idiom: boolean };
}): AnyEntry[] {
  const { scope, area } = opts;
  const result: AnyEntry[] = [];

  if (scope.kind === "all") {
    for (const tier of ["basic", "mid", "adv"] as HskThemeTier[]) {
      if (!area.vocab) continue;
      for (const g of hskThemesByTier(tier))
        for (const e of g.entries)
          result.push({ kind: "vocab", groupId: g.id, ...e });
    }
    if (area.idiom) {
      for (const g of hskThemeIdioms())
        for (const e of g.entries)
          result.push({ kind: "idiom", groupId: g.id, ...e });
    }
    return result;
  }

  if (scope.kind === "tier") {
    if (scope.tier === "idiom") {
      for (const g of hskThemeIdioms())
        for (const e of g.entries)
          result.push({ kind: "idiom", groupId: g.id, ...e });
    } else {
      for (const g of hskThemesByTier(scope.tier))
        for (const e of g.entries)
          result.push({ kind: "vocab", groupId: g.id, ...e });
    }
    return result;
  }

  if (scope.kind === "theme") {
    const vg = findHskThemeGroup(scope.groupId);
    if (vg) {
      for (const e of vg.entries)
        result.push({ kind: "vocab", groupId: vg.id, ...e });
      return result;
    }
    const ig = findHskThemeIdiomGroup(scope.groupId);
    if (ig) {
      for (const e of ig.entries)
        result.push({ kind: "idiom", groupId: ig.id, ...e });
      return result;
    }
    return result;
  }

  // 레거시 vol / lesson — hsk-themes 전환 후 빈 배열 반환
  // (Zustand persist에 남아 있을 수 있는 이전 설정 호환)
  return result;
}

/**
 * Resolve the friendly title for an entry's source group.
 * Used by listen player to show "인사와 가족 · 1/80" style header.
 */
export function lessonTitleFor(entry: AnyEntry): string {
  if (entry.kind === "vocab") {
    return findHskThemeGroup(entry.groupId)?.title ?? "";
  }
  return findHskThemeIdiomGroup(entry.groupId)?.title ?? "";
}
