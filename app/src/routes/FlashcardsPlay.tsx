import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  CircleX,
  RotateCcw,
  X,
  Layers,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import { speakAsync, unlock } from "@/lib/tts";
import { useSettings } from "@/state/settings";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { useFlashcards } from "@/state/flashcards";
import { useStoreHydrated } from "@/lib/useHydrated";

type AreaKind = "vocab" | "idiom";

export default function FlashcardsPlay(): JSX.Element {
  const { area } = useParams<{ area?: string }>();
  // 영속 scope 가 IDB 에서 복원된 뒤에 Player 를 마운트해야 한다.
  // Player 는 useState(baseQueue) 로 큐를 1회만 초기화하므로, 하이드레이션 전
  // 기본 scope 로 큐가 굳으면 사용자가 고른 범위가 반영되지 않는다.
  const hydrated = useStoreHydrated(useFlashcards);
  if (area !== "vocab" && area !== "idiom") {
    return <Navigate to="/flashcards/vocab" replace />;
  }
  if (!hydrated) {
    return (
      <PageShell>
        <div className="py-20 text-center text-sm text-muted" aria-live="polite">
          불러오는 중…
        </div>
      </PageShell>
    );
  }
  return <Player area={area} />;
}

function Player({ area }: { area: AreaKind }): JSX.Element {
  const navigate = useNavigate();
  const { vocabScope, idiomScope, direction } = useFlashcards();
  const scope = area === "vocab" ? vocabScope : idiomScope;
  const ttsRate = useSettings((s) => s.ttsRate);

  // Build queue once at session start.
  const baseQueue = useMemo(
    () =>
      buildListenQueue({
        scope,
        area: { vocab: area === "vocab", idiom: area === "idiom" },
      }),
    [scope, area],
  );

  // 현재 세션 큐 — 틀린 카드가 뒤에 재삽입됨
  const [queue, setQueue] = useState(baseQueue);
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  // 더블탭 방어
  const gradingRef = useRef(false);
  useEffect(() => {
    gradingRef.current = false;
  }, [cursor]);

  /**
   * 키보드 단축키:
   *  - Space: 답 미공개 → 공개, 공개 상태 → '알아요' 채점
   *  - 1(몰라요) / 2(알아요): 답 공개 후 채점
   *  - R: 현재 카드 다시 발화
   */
  const stateRef = useRef({ revealed, queue, cursor, ttsRate });
  useEffect(() => {
    stateRef.current = { revealed, queue, cursor, ttsRate };
  }, [revealed, queue, cursor, ttsRate]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (gradingRef.current) return;
      const { queue: q, cursor: c } = stateRef.current;
      if (c >= q.length) return;
      gradingRef.current = true;

      if (correct) {
        setStats((s) => ({ ...s, correct: s.correct + 1 }));
      } else {
        // 틀린 카드는 큐 끝에 재삽입
        const entry = q[c];
        setQueue((prev) => [...prev, entry]);
        setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      }
      setRevealed(false);
      setCursor((x) => x + 1);
    },
    [],
  );

  const handleRespeak = useCallback(() => {
    const { queue: q, cursor: c, ttsRate: r } = stateRef.current;
    if (c >= q.length) return;
    const e = q[c];
    unlock();
    void speakAsync(e.word || e.pinyin || "", { rate: r }).catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const t = ev.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      const { revealed: rv, queue: q, cursor: c } = stateRef.current;
      if (q.length === 0 || c >= q.length) return;

      if (ev.key === " " || ev.code === "Space") {
        ev.preventDefault();
        if (!rv) setRevealed(true);
        else handleAnswer(true);
        return;
      }
      if (rv && (ev.key === "1" || ev.key === "2")) {
        ev.preventDefault();
        handleAnswer(ev.key === "2");
        return;
      }
      if (ev.key === "r" || ev.key === "R") {
        ev.preventDefault();
        handleRespeak();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleAnswer, handleRespeak]);

  // empty deck
  if (queue.length === 0) {
    return (
      <PageShell>
        <div className="card text-center mt-6 py-8">
          <div className="font-semibold">재생할 카드가 없습니다.</div>
          <div className="text-sm text-muted mt-2">
            선택한 범위에 카드가 없습니다.
          </div>
          <div className="flex justify-center gap-2 mt-5">
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

  // 완료 화면
  if (cursor >= queue.length) {
    const total = stats.correct + stats.wrong;
    return (
      <PageShell>
        <div className="card text-center mt-6 py-8">
          <div className="mb-2 flex justify-center text-success">
            <CheckCircle2 size={40} aria-hidden />
          </div>
          <div className="font-semibold text-lg">완료!</div>
          <div className="text-sm text-muted mt-2">
            {total}회 · 알아요 {stats.correct} · 몰라요 {stats.wrong}
          </div>
          <div className="flex justify-center gap-2 mt-5">
            <button
              type="button"
              onClick={() => {
                setQueue(baseQueue);
                setCursor(0);
                setRevealed(false);
                setStats({ correct: 0, wrong: 0 });
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

  function answer(correct: boolean) {
    handleAnswer(correct);
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
              <div lang="zh-Hans" className="hanzi-text text-5xl">{entry.word}</div>
              {revealed ? (
                <>
                  <div lang="zh-Latn-pinyin" className="pinyin-text text-base">{entry.pinyin}</div>
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
                  <div lang="zh-Latn-pinyin" className="pinyin-text mt-2">{entry.pinyin}</div>
                  <div lang="zh-Hans" className="hanzi-text text-5xl">{entry.word}</div>
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
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="btn-ghost border border-divider flex items-center justify-center gap-2 py-3"
              onClick={() => answer(false)}
              aria-label="몰라요"
            >
              <CircleX size={18} aria-hidden />
              <span>몰라요</span>
            </button>
            <button
              type="button"
              className="btn-primary flex items-center justify-center gap-2 py-3"
              onClick={() => answer(true)}
              aria-label="알아요"
            >
              <Circle size={18} aria-hidden />
              <span>알아요</span>
            </button>
          </div>
        )}
      </PageShell>
    </div>
  );
}
