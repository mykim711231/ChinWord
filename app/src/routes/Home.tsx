import { Link } from "react-router-dom";
import { useMemo } from "react";
import { SpeakerButton } from "@/components/SpeakerButton";
import { useSrs } from "@/state/srsStore";
import { contentMeta, randomVocab } from "@/lib/content";

export default function Home() {
  const today = useMemo(() => randomVocab(), []);
  const due = useSrs((s) => s.dueCards()).length;
  const total = useSrs((s) => s.total());

  return (
    <>
      <div className="mt-1 mb-3 text-xs text-muted">중국어 어휘 학습</div>

      <section className="mt-2">
        <div className="text-xs text-muted px-1 mb-1">🀄 오늘의 단어</div>
        <Link
          to={`/vocab/${today.entry.id}`}
          className="card block hover:shadow-lg transition"
        >
          <div className="text-center">
            <div className="hanzi-text text-4xl">{today.entry.word}</div>
            <div className="pinyin-text mt-1">{today.entry.pinyin}</div>
            <div className="mt-2 text-base">{today.entry.meaning}</div>
            <div className="text-xs text-muted mt-1">— {today.group.title}</div>
          </div>
          <div className="flex justify-center mt-2">
            <SpeakerButton text={today.entry.word} />
          </div>
        </Link>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-semibold">📂 상황별 단어</h2>
          <Link to="/situations" className="text-sm text-primary">모두 보기 →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {contentMeta.vocab.slice(0, 4).map((g) => (
            <Link
              key={g.id}
              to={`/situations/${g.id}`}
              className="card flex flex-col items-center text-center hover:shadow-lg transition py-5"
            >
              <div className="text-3xl" aria-hidden>{g.emoji}</div>
              <div className="font-semibold mt-2">{g.title}</div>
              <div className="text-xs text-muted">{g.titleZh}</div>
              <div className="text-[11px] text-muted mt-1">{g.count}개</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-semibold">📜 고사성어</h2>
          <Link to="/idioms" className="text-sm text-primary">모두 보기 →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {contentMeta.idioms.slice(0, 2).map((g) => (
            <Link
              key={g.id}
              to={`/idioms/${g.id}`}
              className="card flex flex-col items-center text-center hover:shadow-lg transition py-5"
            >
              <div className="text-3xl" aria-hidden>{g.emoji}</div>
              <div className="font-semibold mt-2">{g.title}</div>
              <div className="text-[11px] text-muted mt-1">{g.count}개</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Link to="/flashcards" className="card flex items-center justify-between hover:shadow-lg transition">
          <div>
            <div className="font-semibold">🃏 오늘의 복습</div>
            <div className="text-xs text-muted mt-1">
              {total === 0
                ? "플래시카드를 추가해 시작하세요"
                : due === 0
                ? "복습 없음"
                : `${due}장 복습 대기`}
            </div>
          </div>
          <div className="text-3xl text-primary">{due}</div>
        </Link>
      </section>
    </>
  );
}
