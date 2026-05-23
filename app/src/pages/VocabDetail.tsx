import { useParams, Link } from "react-router-dom";
import { getVocabById } from "@/data/lookup";
import { useTts } from "@/hooks/useTts";
import { useSrsStore } from "@/stores/srsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { DisplayMode } from "@/stores/settingsStore";

export function VocabDetail() {
  const { entryId } = useParams<{ entryId: string }>();
  const entry = getVocabById(entryId ?? "");
  const { speak } = useTts();
  const displayMode = useSettingsStore((s) => s.displayMode);
  const { hasCard, addCard, removeCard } = useSrsStore();

  if (!entry) {
    return (
      <div className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        단어를 찾을 수 없습니다.
      </div>
    );
  }

  const isBookmarked = hasCard(entry.id);

  const showMeaning = (mode: DisplayMode) => mode !== "hanzi";
  const showPinyin = (mode: DisplayMode) => mode !== "hanzi";

  return (
    <div className="space-y-5">
      <button
        onClick={() => window.history.back()}
        className="text-sm bg-transparent border-none cursor-pointer"
        style={{ color: "var(--color-text-muted)" }}
      >
        ‹ 뒤로
      </button>

      <div className="text-center py-6 rounded-xl" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}>
        <p className="text-5xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
          {entry.word}
        </p>
        {showPinyin(displayMode) && (
          <p className="text-lg mb-1" style={{ color: "var(--color-pinyin)" }}>
            {entry.pinyin}
          </p>
        )}
        {showMeaning(displayMode) && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary)" }}
            >
              {entry.pos}
            </span>
            {entry.hskLevel > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
              >
                HSK {entry.hskLevel}
              </span>
            )}
          </div>
        )}
        {showMeaning(displayMode) && (
          <p className="text-lg font-semibold mt-3" style={{ color: "var(--color-text)" }}>
            {entry.meaning}
          </p>
        )}
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
              addCard(entry.id, "vocab");
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

      {entry.hanjaBreakdown && (
        <section
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
            한자 풀이
          </h2>
          {entry.hanjaBreakdown.split("\n").map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return null;
            return (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {trimmed}
              </p>
            );
          })}
        </section>
      )}
    </div>
  );
}
