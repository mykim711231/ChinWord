import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Frown,
  Meh,
  Smile,
  RotateCcw,
  X,
  Layers,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { useFlashcards } from "@/state/flashcards";
import { useSrs } from "@/state/srsStore";
import { type Difficulty } from "@/lib/srs";

type AreaKind = "vocab" | "idiom";

export default function FlashcardsPlay(): JSX.Element {
  const { area } = useParams<{ area?: string }>();
  if (area !== "vocab" && area !== "idiom") {
    return <Navigate to="/flashcards/vocab" replace />;
  }
  return <Player area={area} />;
}

function Player({ area }: { area: AreaKind }): JSX.Element {
  const navigate = useNavigate();
  const { vocabScope, idiomScope, dueOnly, direction } = useFlashcards();
  const scope = area === "vocab" ? vocabScope : idiomScope;

  const addCard = useSrs((s) => s.addCard);
  const reviewCard = useSrs((s) => s.reviewCard);
  const cardMap = useSrs((s) => s.cards);

  // Build queue once at session start. We snapshot it so that grading
  // (which mutates SRS state) doesn't shorten the deck mid-session.
  const queue = useMemo(() => {
    const full = buildListenQueue({
      scope,
      area: { vocab: area === "vocab", idiom: area === "idiom" },
    });
    if (!dueOnly) return full;
    const now = Date.now();
    return full.filter((e) => {
      const c = cardMap[e.id];
      return c && !c.masteredAt && c.dueAt <= now;
    });
    // intentionally do not depend on cardMap — snapshot on entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, area, dueOnly]);

  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ easy: 0, ok: 0, hard: 0 });

  // empty-deck guard
  useEffect(() => {
    if (queue.length === 0) navigate(`/flashcards/${area}`, { replace: true });
  }, [queue.length, navigate, area]);

  if (queue.length === 0) {
    return (
      <PageShell>
        <div className="text-center text-muted mt-12">재생할 카드가 없습니다.</div>
      </PageShell>
    );
  }

  if (cursor >= queue.length) {
    const total = stats.easy + stats.ok + stats.hard;
    return (
      <PageShell>
        <div className="card text-center mt-6 py-8">
          <div className="mb-2 flex justify-center text-success">
            <CheckCircle2 size={40} aria-hidden />
          </div>
          <div className="font-semibold text-lg">완료!</div>
          <div className="text-sm text-muted mt-2">
            {total}개 · 쉬움 {stats.easy} · 보통 {stats.ok} · 어려움 {stats.hard}
          </div>
          <div className="flex justify-center gap-2 mt-5">
            <button
              type="button"
              onClick={() => {
                setCursor(0);
                setRevealed(false);
                setStats({ easy: 0, ok: 0, hard: 0 });
              }}
              className="btn-ghost inline-flex items-center gap-1 border border-divider"
            >
              <RotateCcw size={14} aria-hidden />
              <span>다시</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/flashcards/${area}`)}
              className="btn-primary"
            >
              설정으로
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const entry = queue[cursor];
  const lessonTitle = lessonTitleFor(entry);

  function answer(diff: Difficulty) {
    // Ensure card exists in SRS, then grade.
    if (!cardMap[entry.id]) {
      addCard(entry.id, area);
    }
    reviewCard(entry.id, diff);
    setStats((s) => ({ ...s, [diff]: s[diff] + 1 }));
    setRevealed(false);
    setCursor((c) => c + 1);
  }

  function skip() {
    setRevealed(false);
    setCursor((c) => c + 1);
  }

  // Front/back content depends on direction
  const hanziFront = direction === "hanzi-first";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-primary-soft/40">
      <PageShell>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 text-primary font-semibold">
            <Layers size={16} aria-hidden />
            <span>{area === "vocab" ? "단어" : "성어"} 플래시카드</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/flashcards/${area}`)}
            className="btn-ghost text-sm inline-flex items-center gap-1"
            aria-label="플래시카드 종료"
          >
            <X size={14} aria-hidden />
            <span>종료</span>
          </button>
        </div>

        <div className="card text-center py-8 min-h-[280px] flex flex-col justify-center items-center gap-3">
          <div className="text-xs text-muted">
            {lessonTitle} ·{" "}
            <span className="tabular-nums">
              {cursor + 1}/{queue.length}
            </span>
          </div>

          {hanziFront ? (
            // 한자 → 뜻
            <>
              <div className="hanzi-text text-5xl">{entry.word}</div>
              {revealed ? (
                <>
                  <div className="pinyin-text text-base">{entry.pinyin}</div>
                  <div className="text-base mt-1">{entry.meaning}</div>
                  <div className="text-xs text-muted">[{entry.pos}]</div>
                </>
              ) : null}
              <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
            </>
          ) : (
            // 뜻 → 한자
            <>
              <div className="text-2xl font-semibold">{entry.meaning}</div>
              <div className="text-xs text-muted">[{entry.pos}]</div>
              {revealed ? (
                <>
                  <div className="pinyin-text mt-2">{entry.pinyin}</div>
                  <div className="hanzi-text text-5xl">{entry.word}</div>
                  <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
                </>
              ) : null}
            </>
          )}
        </div>

        {!revealed ? (
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setRevealed(true)}
            >
              답 보기
            </button>
            <button
              type="button"
              className="btn-ghost text-sm text-muted"
              onClick={skip}
            >
              건너뛰기
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              type="button"
              className="btn-ghost border border-divider inline-flex items-center justify-center gap-1 py-3"
              onClick={() => answer("hard")}
            >
              <Frown size={16} aria-hidden />
              <span>어려움</span>
            </button>
            <button
              type="button"
              className="btn-ghost border border-divider inline-flex items-center justify-center gap-1 py-3"
              onClick={() => answer("ok")}
            >
              <Meh size={16} aria-hidden />
              <span>보통</span>
            </button>
            <button
              type="button"
              className="btn-primary inline-flex items-center justify-center gap-1 py-3"
              onClick={() => answer("easy")}
            >
              <Smile size={16} aria-hidden />
              <span>쉬움</span>
            </button>
          </div>
        )}
      </PageShell>
    </div>
  );
}
