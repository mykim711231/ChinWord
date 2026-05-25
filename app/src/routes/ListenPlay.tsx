import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Headphones,
  X,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { splitPinyin } from "@/lib/pinyin";
import { cancelSpeak, speakAsync } from "@/lib/tts";
import { useListen } from "@/state/listen";
import { useSettings } from "@/state/settings";

const HANZI_RE = /\p{Script=Han}/u;

export default function ListenPlay(): JSX.Element {
  const navigate = useNavigate();
  const { scope, area, display, intervalSec, repeats, setIntervalSec, setRepeats } =
    useListen();
  const ttsRate = useSettings((s) => s.ttsRate);

  const queue = useMemo(
    () => buildListenQueue({ scope, area }),
    [scope, area],
  );

  const [index, setIndex] = useState(0);
  /** Current repetition of the current card (1-based). */
  const [rep, setRep] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);

  // Refs so the long-running loop sees latest state without re-spawning.
  const indexRef = useRef(index);
  indexRef.current = index;
  const repRef = useRef(rep);
  repRef.current = rep;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const intervalRef = useRef(intervalSec);
  intervalRef.current = intervalSec;
  const repeatsRef = useRef(repeats);
  repeatsRef.current = repeats;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;

  const acRef = useRef<AbortController | null>(null);
  // Resolve to trigger advance from controls
  const advanceRef = useRef<(() => void) | null>(null);

  const current = queue[index];

  // Empty queue guard
  useEffect(() => {
    if (queue.length === 0) navigate("/listen", { replace: true });
  }, [queue.length, navigate]);

  /** Sleep helper that resolves early if paused or advance fired. */
  const wait = useCallback(
    (ms: number, ac: AbortController): Promise<"timeout" | "advanced"> =>
      new Promise((resolve) => {
        let resolved = false;
        const t = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          advanceRef.current = null;
          resolve("timeout");
        }, ms);
        advanceRef.current = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(t);
          advanceRef.current = null;
          resolve("advanced");
        };
        ac.signal.addEventListener(
          "abort",
          () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(t);
            advanceRef.current = null;
            resolve("timeout");
          },
          { once: true },
        );
      }),
    [],
  );

  // Master playback loop — restarts whenever queue identity changes.
  useEffect(() => {
    if (queue.length === 0) return;
    acRef.current?.abort();
    cancelSpeak();
    const ac = new AbortController();
    acRef.current = ac;
    let cancelled = false;

    const run = async () => {
      while (!cancelled) {
        if (ac.signal.aborted) return;
        // pause loop
        while (!playingRef.current && !ac.signal.aborted) {
          await new Promise((r) => setTimeout(r, 100));
        }
        if (ac.signal.aborted) return;
        const i = indexRef.current;
        if (i >= queue.length) {
          setPlaying(false);
          setFinished(true);
          return;
        }
        const entry = queue[i];
        const phrase = entry.pinyin || entry.word;
        try {
          await speakAsync(phrase, {
            rate: rateRef.current,
            signal: ac.signal,
          });
        } catch {
          /* ignore */
        }
        if (ac.signal.aborted || !playingRef.current) continue;
        const gapResult = await wait(intervalRef.current * 1000, ac);
        if (ac.signal.aborted) return;
        if (!playingRef.current && gapResult === "timeout") continue;

        // Per-card repeat: speak the SAME card again until we've hit the
        // configured repeat count, then advance to the next card.
        if (repRef.current < repeatsRef.current) {
          setRep((n) => n + 1);
        } else {
          setRep(1);
          setIndex((n) => n + 1);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      ac.abort();
      cancelSpeak();
    };
    // queue.length captures queue identity for our purposes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, wait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      acRef.current?.abort();
      cancelSpeak();
    };
  }, []);

  function onTogglePlay() {
    if (finished) {
      // restart
      setFinished(false);
      setRep(1);
      setIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
    if (playingRef.current) {
      cancelSpeak();
    }
  }

  function onPrev() {
    cancelSpeak();
    advanceRef.current?.();
    setRep(1);
    setIndex((i) => Math.max(0, i - 1));
    setFinished(false);
    setPlaying(true);
  }

  function onNext() {
    cancelSpeak();
    advanceRef.current?.();
    setRep(1);
    setIndex((i) => Math.min(queue.length, i + 1));
    setFinished(false);
    setPlaying(true);
  }

  function onExit() {
    acRef.current?.abort();
    cancelSpeak();
    navigate("/listen");
  }

  if (queue.length === 0) {
    return (
      <PageShell>
        <div className="text-center text-muted mt-12">재생할 항목이 없습니다.</div>
      </PageShell>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-primary-soft/40">
      <PageShell>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 text-primary font-semibold">
            <Headphones size={16} aria-hidden />
            <span>이어듣기</span>
            {repeats > 1 ? (
              <span className="text-xs text-muted">
                · {rep}/{repeats}회
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onExit}
            className="btn-ghost text-sm inline-flex items-center gap-1"
            aria-label="이어듣기 종료"
          >
            <X size={14} aria-hidden />
            <span>종료</span>
          </button>
        </div>

        <div className="card text-center py-6 min-h-[220px] flex flex-col justify-center">
          <div className="text-xs text-muted mb-2">
            {current ? lessonTitleFor(current) : ""} ·{" "}
            <span className="tabular-nums">
              {Math.min(index + 1, queue.length)}/{queue.length}
            </span>
          </div>

          {current ? (
            <PinyinHanziStack
              word={current.word}
              pinyin={current.pinyin}
              showHanzi={display.hanzi}
              showPinyin={display.pinyin}
            />
          ) : null}

          {display.korean && current ? (
            <div className="mt-3 text-sm text-fg/80">{current.meaning}</div>
          ) : null}
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0 && rep === 1}
            className="w-11 h-11 rounded-full border border-divider bg-surface inline-flex items-center justify-center disabled:opacity-40"
            aria-label="이전"
          >
            <SkipBack size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-14 h-14 rounded-full bg-primary text-white inline-flex items-center justify-center shadow-lg active:scale-95 transition"
            aria-label={playing ? "일시정지" : finished ? "처음부터 다시" : "재생"}
          >
            {playing ? (
              <Pause size={22} aria-hidden />
            ) : (
              <Play size={22} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={finished}
            className="w-11 h-11 rounded-full border border-divider bg-surface inline-flex items-center justify-center disabled:opacity-40"
            aria-label="다음"
          >
            <SkipForward size={18} aria-hidden />
          </button>
        </div>

        {/* Inline interval control */}
        <div className="mt-6 px-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">카드 간격</span>
            <span className="text-sm tabular-nums">{intervalSec.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="w-full"
            aria-label="카드 간격"
          />
        </div>

        <div className="mt-3 flex items-center justify-between px-2">
          <span className="text-xs text-muted">반복</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRepeats(repeats - 1)}
              disabled={repeats <= 1}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 감소"
            >
              −
            </button>
            <span className="tabular-nums w-6 text-center">{repeats}</span>
            <button
              type="button"
              onClick={() => setRepeats(repeats + 1)}
              disabled={repeats >= 10}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 증가"
            >
              +
            </button>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>

        {finished ? (
          <div className="mt-4 text-center text-sm text-primary">
            완료 — 다시 재생하려면 ▶ 버튼을 누르세요.
          </div>
        ) : null}
      </PageShell>
    </div>
  );
}

function PinyinHanziStack({
  word,
  pinyin,
  showHanzi,
  showPinyin,
}: {
  word: string;
  pinyin: string;
  showHanzi: boolean;
  showPinyin: boolean;
}) {
  const chars = Array.from(word);
  const hanziCount = chars.filter((c) => HANZI_RE.test(c)).length;
  const syllables = showPinyin
    ? splitPinyin(pinyin, hanziCount) ?? null
    : null;

  // Per-char aligned view if syllables resolved
  if (showPinyin && showHanzi && syllables) {
    let pi = 0;
    return (
      <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-2">
        {chars.map((c, i) => {
          const isHan = HANZI_RE.test(c);
          const syl = isHan ? syllables[pi++] : null;
          return (
            <div key={i} className="flex flex-col items-center">
              <span className="pinyin-text text-sm text-fg/80 min-h-[1.25rem]">
                {syl ?? ""}
              </span>
              <span className="hanzi-text text-5xl leading-none">{c}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Stacked but unaligned (or selective)
  return (
    <div>
      {showPinyin ? (
        <div className="pinyin-text text-sm text-fg/80">{pinyin}</div>
      ) : null}
      {showHanzi ? (
        <div className="hanzi-text text-5xl mt-1">{word}</div>
      ) : null}
    </div>
  );
}
