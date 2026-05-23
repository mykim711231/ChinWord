import { useParams, Link } from "react-router-dom";
import { getIdiomGroupById } from "@/data/lookup";
import { useTts } from "@/hooks/useTts";

export function IdiomGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const group = getIdiomGroupById(groupId ?? "");
  const { speak } = useTts();

  if (!group) {
    return (
      <div className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        그룹을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <button
          onClick={() => window.history.back()}
          className="text-sm mb-2 bg-transparent border-none cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
        >
          ‹ 뒤로
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          {group.title}
        </h1>
      </header>

      <div className="space-y-2">
        {group.entries.map((entry) => (
          <Link
            key={entry.id}
            to={`/idiom/${entry.id}`}
            className="block rounded-xl p-4 no-underline"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {entry.word}
                </p>
                <p className="text-sm" style={{ color: "var(--color-pinyin)" }}>
                  {entry.pinyin}
                </p>
                <p className="text-sm truncate" style={{ color: "var(--color-text-muted)" }}>
                  {entry.meaning}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  speak(entry.word, "zh-CN");
                }}
                className="shrink-0 ml-3 w-10 h-10 rounded-full flex items-center justify-center text-lg border-none cursor-pointer"
                style={{ backgroundColor: "var(--color-primary-soft)" }}
                title="발음 듣기"
              >
                🔊
              </button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
