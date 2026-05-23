import { useState, useCallback } from "react";
import { useSrsStore } from "@/stores/srsStore";
import { getVocabById, getIdiomById } from "@/data/lookup";
import { useTts } from "@/hooks/useTts";
import type { SrsCard } from "@/types";

export function Flashcards() {
  const { dueCards, markAnswer, addCard, removeCard, hasCard } = useSrsStore();
  const { speak } = useTts();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  const cards = dueCards();

  const currentCard: SrsCard | undefined = cards[currentIndex];
  const entry = currentCard
    ? (currentCard.type === "vocab"
        ? getVocabById(currentCard.entryId)
        : getIdiomById(currentCard.entryId))
    : undefined;

  const goNext = useCallback(() => {
    if (currentIndex + 1 >= cards.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [currentIndex, cards.length]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (!currentCard) return;
      markAnswer(currentCard.entryId, correct);
      goNext();
    },
    [currentCard, markAnswer, goNext]
  );

  if (cards.length === 0 || finished) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            복습
          </h1>
        </header>
        <div
          className="text-center py-12 rounded-xl space-y-4"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <p className="text-4xl">🎉</p>
          <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {finished ? "복습 완료!" : "복습할 카드가 없습니다"}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {finished
              ? "모든 복습 카드를 완료했습니다. 내일 다시 확인해주세요."
              : "새 단어를 단어장에 추가하면 여기서 복습할 수 있습니다."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          복습
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {currentIndex + 1} / {cards.length}
        </p>
      </header>

      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--color-divider)" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
            backgroundColor: "var(--color-primary)",
          }}
        />
      </div>

      {currentCard && (
        <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
          박스 {currentCard.box} · 간격 {currentCard.intervalDays}일
        </p>
      )}

      <div
        onClick={() => {
          setFlipped(!flipped);
          if (!flipped && entry) {
            speak(entry.word, "zh-CN");
          }
        }}
        className="rounded-xl p-8 text-center cursor-pointer min-h-[200px] flex flex-col items-center justify-center"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
      >
        {entry && (
          <>
            <p className="text-4xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
              {entry.word}
            </p>
            {flipped ? (
              <div className="space-y-2">
                <p className="text-xl" style={{ color: "var(--color-pinyin)" }}>
                  {entry.pinyin}
                </p>
                <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                  {entry.meaning}
                </p>
                {"pos" in entry && (
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary)" }}
                  >
                    {entry.pos}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm mt-4" style={{ color: "var(--color-text-muted)" }}>
                탭하여 뜻 보기
              </p>
            )}
          </>
        )}
      </div>

      {flipped && (
        <div className="flex gap-3">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 py-3 rounded-xl font-medium border-none cursor-pointer text-sm"
            style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary)" }}
          >
            몰라요
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 py-3 rounded-xl font-medium border-none cursor-pointer text-sm"
            style={{ backgroundColor: "var(--color-success)", color: "#fff" }}
          >
            알아요
          </button>
        </div>
      )}

      {!flipped && (
        <button
          onClick={() => setFlipped(true)}
          className="w-full py-3 rounded-xl font-medium border-none cursor-pointer text-sm"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-divider)" }}
        >
          정답 보기
        </button>
      )}
    </div>
  );
}
