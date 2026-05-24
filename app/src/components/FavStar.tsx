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
        "btn-ghost text-xl"
      }
    >
      <span className={has ? "text-accent" : "text-muted"}>{has ? "★" : "☆"}</span>
    </button>
  );
}
