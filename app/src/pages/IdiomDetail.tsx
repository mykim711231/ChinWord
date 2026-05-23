import { useParams } from "react-router-dom";
import { getIdiomById } from "@/data/lookup";
import { useTts } from "@/hooks/useTts";
import { useSrsStore } from "@/stores/srsStore";

export function IdiomDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const entry = getIdiomById(entryId ?? "");
  const { speak } = useTts();
  const { hasCard, addCard, removeCard } = useSrsStore();

  if (!entry) {
    return (
      <div className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        성어를 찾을 수 없습니다.
      </div>
    );
  }

  const isBookmarked = hasCard(entry.id);

  return (
    <div className="space-y-5">
      <button
        onClick={() => window.history.back()}
        className="text-sm bg-transparent border-none cursor-pointer"
        style={{ color: "var(--color-text-muted)" }}
      >
        ‹ 뒤로
      </button>

      <div
        className="text-center py-6 rounded-xl"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
      >
        <p className="text-4xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
          {entry.word}
        </p>
        <p className="text-lg mb-1" style={{ color: "var(--color-pinyin)" }}>
          {entry.pinyin}
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary)" }}
        >
          {entry.pos}
        </span>
        <p className="text-lg font-semibold mt-3" style={{ color: "var(--color-text)" }}>
          {entry.meaning}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={() => speak(entry.word, "zh-CN")}
          className="px-5 py-2.5 rounded-full font-medium border-none cursor-pointer text-sm"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          🔊 발음 듣기
        </button>
        <button
          onClick={() => speak(entry.meaning, "ko-KR")}
          className="px-5 py-2.5 rounded-full font-medium border-none cursor-pointer text-sm"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-divider)" }}
        >
          🇰🇷 뜻 듣기
        </button>
        <button
          onClick={() => {
            if (isBookmarked) {
              removeCard(entry.id);
            } else {
              addCard(entry.id, "idiom");
            }
          }}
          className="px-5 py-2.5 rounded-full font-medium border-none cursor-pointer text-sm"
          style={{
            backgroundColor: isBookmarked ? "var(--color-success)" : "var(--color-surface)",
            color: isBookmarked ? "#fff" : "var(--color-text)",
            border: isBookmarked ? "none" : "1px solid var(--color-divider)",
          }}
        >
          {isBookmarked ? "🃏 복습 중" : "+ 복습 추가"}
        </button>
      </div>

      {entry.origin && (
        <section
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
            유래
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {entry.origin}
          </p>
        </section>
      )}

      {entry.charBreakdown.length > 0 && (
        <section
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
            글자별 풀이
          </h2>
          <div className="space-y-2">
            {entry.charBreakdown.map((cb, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="text-xl font-bold w-8 text-center"
                  style={{ color: "var(--color-text)" }}
                >
                  {cb.char}
                </span>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-pinyin)" }}>
                    {cb.pinyin}
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {cb.meaning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {entry.synonyms.length > 0 && (
        <section
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
            유의어
          </h2>
          <div className="flex flex-wrap gap-2">
            {entry.synonyms.map((s, i) => (
              <span
                key={i}
                className="text-sm px-3 py-1 rounded-full"
                style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary)" }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {entry.sourceText && (
        <section
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
            출전
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {entry.sourceText}
          </p>
        </section>
      )}
    </div>
  );
}
