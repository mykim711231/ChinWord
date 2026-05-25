import { Star } from "lucide-react";
import { useFavorites } from "@/state/favorites";

export function FavStar({ id, className }: { id: string; className?: string }) {
  const has = useFavorites((s) => !!s.ids[id]);
  const toggle = useFavorites((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={has}
      aria-label={has ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={
        className ??
        "inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-primary-soft"
      }
    >
      <Star
        size={20}
        aria-hidden
        fill={has ? "#F5C518" : "none"}
        stroke={has ? "#B8860B" : "currentColor"}
        strokeWidth={1.5}
        className={has ? "" : "text-muted"}
      />
    </button>
  );
}
