import { useMemo } from "react";
import type { AnyEntry } from "@/types";
import { useFavorites } from "@/state/favorites";
import { useReview } from "@/state/review";

/**
 * 학습 덱 필터 — 범위(scope)로 추린 카드 위에 한 번 더 거는 부분집합 필터.
 *  - "all"      : 필터 없음(범위 그대로)
 *  - "favorite" : 즐겨찾기(⭐)한 카드만
 *  - "unknown"  : 플래시카드에서 "몰라요"로 표시한 카드만
 *
 * 플래시카드·이어듣기·필순 설정/재생 화면이 공통으로 사용한다.
 */
export type DeckFilter = "all" | "favorite" | "unknown";

/** scope 큐(base)에 덱 필터를 적용한 큐를 반환(즐겨찾기/모름 변경에 반응). */
export function useDeckFilter(base: AnyEntry[], filter: DeckFilter): AnyEntry[] {
  const favIds = useFavorites((s) => s.ids);
  const unkIds = useReview((s) => s.unknownIds);
  return useMemo(() => {
    if (filter === "favorite") return base.filter((e) => favIds[e.id]);
    if (filter === "unknown") return base.filter((e) => unkIds[e.id]);
    return base;
  }, [base, filter, favIds, unkIds]);
}

/** base 큐 안에서 각 필터에 해당하는 카드 수(칩 라벨/빈 상태 안내용). */
export function useDeckFilterCounts(base: AnyEntry[]): {
  all: number;
  favorite: number;
  unknown: number;
} {
  const favIds = useFavorites((s) => s.ids);
  const unkIds = useReview((s) => s.unknownIds);
  return useMemo(() => {
    let favorite = 0;
    let unknown = 0;
    for (const e of base) {
      if (favIds[e.id]) favorite += 1;
      if (unkIds[e.id]) unknown += 1;
    }
    return { all: base.length, favorite, unknown };
  }, [base, favIds, unkIds]);
}
