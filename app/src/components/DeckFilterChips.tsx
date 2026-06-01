import { Layers, Star, HelpCircle } from "lucide-react";
import type { AnyEntry } from "@/types";
import { useDeckFilterCounts, type DeckFilter } from "@/lib/deck-filter";

/**
 * 학습 덱 필터 칩 — 전체 / 즐겨찾기 / 모름.
 * 범위(scope)로 추린 base 큐 안의 해당 카드 수를 함께 표시한다.
 * 플래시카드·이어듣기·필순 설정 화면 공통 컴포넌트.
 */
const FILTERS: { value: DeckFilter; label: string; Icon: typeof Layers }[] = [
  { value: "all", label: "전체", Icon: Layers },
  { value: "favorite", label: "즐겨찾기", Icon: Star },
  { value: "unknown", label: "모름", Icon: HelpCircle },
];

export function DeckFilterChips({
  base,
  value,
  onChange,
}: {
  base: AnyEntry[];
  value: DeckFilter;
  onChange: (f: DeckFilter) => void;
}): JSX.Element {
  const counts = useDeckFilterCounts(base);
  return (
    <section className="card">
      <span className="block text-xs text-muted mb-2">학습 대상</span>
      <div className="grid grid-cols-3 gap-2">
        {FILTERS.map(({ value: v, label, Icon }) => {
          const on = value === v;
          const n = counts[v];
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={on}
              className={
                "rounded-btn border px-2 py-2 text-sm inline-flex flex-col items-center gap-1 " +
                (on
                  ? "bg-primary text-white border-primary font-medium"
                  : "bg-surface text-fg border-divider")
              }
            >
              <Icon size={16} aria-hidden />
              <span>{label}</span>
              <span
                className={
                  "text-[11px] tabular-nums " + (on ? "text-white/80" : "text-muted")
                }
              >
                {n}개
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-2">
        즐겨찾기는 ⭐ 표시한 카드, 모름은 플래시카드에서 "몰라요"로 답한 카드입니다.
      </p>
    </section>
  );
}
