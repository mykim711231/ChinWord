import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

/**
 * SRS store 가 IndexedDB 에서 hydration 되는 동안 cards 는 `{}` 이다.
 * 이때 dueOnly 모드의 큐 빌드를 돌리면 cardMap[id] 가 전부 undefined 라
 * 큐가 강제로 비고 empty-deck guard 가 즉시 발동해 사용자를 설정 화면으로
 * 튕겨낸다. hasHydrated 가 true 가 될 때까지 마운트를 지연시켜 막는다.
 * (SMCB 는 main.tsx 에서 사전 hydrate 후 render — 동일 보호 효과.)
 */
function useSrsHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useSrs.persist.onFinishHydration(cb),
    () => useSrs.persist.hasHydrated(),
    () => false,
  );
}

type AreaKind = "vocab" | "idiom";

export default function FlashcardsPlay(): JSX.Element {
  const { area } = useParams<{ area?: string }>();
  const srsReady = useSrsHydrated();
  if (area !== "vocab" && area !== "idiom") {
    return <Navigate to="/flashcards/vocab" replace />;
  }
  // SRS hydration 대기 — dueOnly 모드 즉시 튕김 방지. 첫 페인트 후 ~수 ms.
  if (!srsReady) {
    return (
      <PageShell>
        <div className="text-center text-muted mt-12">불러오는 중…</div>
      </PageShell>
    );
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

  // 더블탭 방어 — disabled prop 만으로는 React 18 concurrent 환경에서
  // re-render flush 전에 두 번째 탭이 들어올 수 있다. useRef 가드를 병행해
  // 같은 카드에 대한 reviewCard() 가 중복 실행되어 SM-2 진행이 잘못되는 것을 차단.
  // 다음 카드로 넘어갈 때(cursor 변경) 자동 해제.
  const gradingRef = useRef(false);
  useEffect(() => {
    gradingRef.current = false;
  }, [cursor]);

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
    if (gradingRef.current) return;
    gradingRef.current = true;
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
    if (gradingRef.current) return;
    gradingRef.current = true;
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
