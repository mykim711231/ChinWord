import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import { useSrs } from "@/state/srsStore";
import { getEntryById } from "@/lib/content";
import { BOX_INTERVAL_DAYS, type Difficulty } from "@/lib/srs";

export default function Flashcards() {
  const cards = useSrs((s) => s.cards);
  const reviewCard = useSrs((s) => s.reviewCard);
  const removeCard = useSrs((s) => s.removeCard);
  const total = useSrs((s) => s.total());

  const dueQueue = useMemo(
    () =>
      Object.values(cards)
        .filter((c) => !c.masteredAt && c.dueAt <= Date.now())
        .sort((a, b) => a.dueAt - b.dueAt),
    [cards],
  );

  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (total === 0) {
    return (
      <PageShell>
        <TopBar title="플래시카드" />
        <div className="card text-center mt-6">
          <div className="text-3xl mb-2">🃏</div>
          <p className="text-sm text-muted">
            아직 추가된 카드가 없습니다. 단어/성어 상세에서 "+ 복습에 추가"를 눌러주세요.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Link to="/situations" className="btn-primary text-sm">단어로 가기</Link>
            <Link to="/idioms" className="btn-ghost text-sm">성어로 가기</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (dueQueue.length === 0 || cursor >= dueQueue.length) {
    const nextDue = Object.values(cards)
      .filter((c) => !c.masteredAt)
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    return (
      <PageShell>
        <TopBar title="플래시카드" />
        <div className="card text-center mt-6">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-semibold">오늘 복습 완료!</div>
          {nextDue ? (
            <div className="text-xs text-muted mt-2">
              다음 복습: {new Date(nextDue.dueAt).toLocaleString()}
            </div>
          ) : null}
        </div>
      </PageShell>
    );
  }

  const card = dueQueue[cursor];
  const entry = getEntryById(card.id);
  if (!entry) {
    // Orphan card — clean up and skip
    removeCard(card.id);
    return null;
  }

  const onAnswer = (diff: Difficulty) => {
    reviewCard(card.id, diff);
    setFlipped(false);
    setCursor((c) => c + 1);
  };

  return (
    <PageShell>
      <TopBar title="플래시카드" subtitle={`Box ${card.box} · ${BOX_INTERVAL_DAYS[card.box]}일 간격`} />
      <div className="text-xs text-muted px-1 mb-1">
        오늘 복습: {cursor + 1} / {dueQueue.length}
      </div>

      <div className="card text-center min-h-[260px] flex flex-col justify-center items-center gap-3">
        <div className="hanzi-text text-5xl">{entry.word}</div>
        {!flipped ? (
          <>
            <SpeakerButton text={entry.word} />
            <button
              type="button"
              className="btn-primary text-sm mt-2"
              onClick={() => setFlipped(true)}
            >
              뜻 보기
            </button>
          </>
        ) : (
          <>
            <div className="pinyin-text">{entry.pinyin}</div>
            <div className="text-base">{entry.meaning}</div>
            <div className="text-xs text-muted">[{entry.pos}]</div>
            <SpeakerButton text={entry.word} />
          </>
        )}
      </div>

      {flipped ? (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button type="button" className="btn-ghost border border-divider" onClick={() => onAnswer("hard")}>
            😖 어려움
          </button>
          <button type="button" className="btn-ghost border border-divider" onClick={() => onAnswer("ok")}>
            😐 보통
          </button>
          <button type="button" className="btn-primary" onClick={() => onAnswer("easy")}>
            😊 쉬움
          </button>
        </div>
      ) : (
        <div className="text-xs text-center text-muted mt-4">
          카드를 뒤집어 정답 확인 후 난이도를 선택하세요.
        </div>
      )}
    </PageShell>
  );
}
