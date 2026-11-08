import { useThemeDone } from "@/state/themeDone";

/** 테마 카드 우상단 "완료" 표시. */
export function DoneBadge({ id }: { id: string }) {
  const done = useThemeDone((s) => Boolean(s.doneIds[id]));
  if (!done) return null;
  return (
    <span className="absolute top-1 right-1.5 text-[10px] font-semibold text-primary">
      ✔ 완료
    </span>
  );
}
