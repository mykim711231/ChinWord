import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Headphones,
  X,
  CheckCircle2,
  RotateCcw,
  Repeat,
  Shuffle,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { splitPinyin } from "@/lib/pinyin";
import { cancelSpeak, speakAsync, speakKoreanAsync, unlock } from "@/lib/tts";
import { useListen } from "@/state/listen";
import { useSettings } from "@/state/settings";

const HANZI_RE = /\p{Script=Han}/u;

/** Fisher-Yates shuffle (immutable). */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ListenPlay(): JSX.Element {
  const navigate = useNavigate();
  const {
    scope, area, display, intervalSec, repeats, loop, shuffle,
    setDisplay, setIntervalSec, setRepeats, setLoop, setShuffle,
  } = useListen();
  const ttsRate = useSettings((s) => s.ttsRate);

  const rawQueue = useMemo(
    () => buildListenQueue({ scope, area }),
    [scope, area],
  );

  // shuffleKey: loop 반복 시 매번 증가 → useMemo 무효화 → 재셔플
  const [shuffleKey, setShuffleKey] = useState(0);
  const queue = useMemo(
    () => (shuffle ? shuffleArray(rawQueue) : rawQueue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawQueue, shuffle, shuffleKey],
  );

  const [index, setIndex] = useState(0);
  const [rep, setRep] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);

  const intervalRef = useRef(intervalSec);
  intervalRef.current = intervalSec;
  const repeatsRef = useRef(repeats);
  repeatsRef.current = repeats;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const displayRef = useRef(display);
  displayRef.current = display;

  const acRef = useRef<AbortController | null>(null);
  const current = queue[index];

  useEffect(() => {
    if (queue.length === 0) navigate("/listen", { replace: true });
  }, [queue.length, navigate]);

  const wait = useCallback(
    (ms: number, ac: AbortController): Promise<void> =>
      new Promise((resolve) => {
        if (ac.signal.aborted) return resolve();
        const t = setTimeout(() => {
          ac.signal.removeEventListener("abort", onAbort);
          resolve();
        }, ms);
        const onAbort = (): void => { clearTimeout(t); resolve(); };
        ac.signal.addEventListener("abort", onAbort, { once: true });
      }),
    [],
  );

  useEffect(() => {
    if (queue.length === 0) return;
    if (!playing) return;
    if (finished) return;
    if (index >= queue.length) {
      if (loopRef.current) {
        setRep(1);
        setIndex(0);
        // loop+shuffle: 매 바퀴 재셔플
        if (shuffleRef.current) setShuffleKey((k) => k + 1);
        return;
      }
      setFinished(true);
      setPlaying(false);
      return;
    }

    const ac = new AbortController();
    acRef.current = ac;

    const run = async (): Promise<void> => {
      const entry = queue[index];
      const phrase = entry.word || entry.pinyin;

      try {
        await speakAsync(phrase, { rate: rateRef.current, signal: ac.signal });
      } catch { /* ignore */ }
      if (ac.signal.aborted) return;

      if (displayRef.current.korean && entry.meaning) {
        await wait(300, ac);
        if (ac.signal.aborted) return;
        try {
          await speakKoreanAsync(entry.meaning, { rate: 1.0, signal: ac.signal });
        } catch { /* ignore */ }
        if (ac.signal.aborted) return;
      }

      await wait(intervalRef.current * 1000, ac);
      if (ac.signal.aborted) return;

      if (rep < repeatsRef.current) {
        setRep((r) => r + 1);
      } else {
        setRep(1);
        setIndex((n) => n + 1);
      }
    };

    void run();
    return () => { ac.abort(); cancelSpeak(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index, rep, playing, finished, wait]);

  useEffect(() => () => { acRef.current?.abort(); cancelSpeak(); }, []);

  function onTogglePlay() {
    unlock();
    if (finished) {
      setFinished(false);
      setRep(1);
      setIndex(0);
      if (shuffle) setShuffleKey((k) => k + 1);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  function onPrev() {
    unlock();
    setRep(1);
    setFinished(false);
    setPlaying(true);
    setIndex((i) => Math.max(0, i - 1));
  }

  function onNext() {
    unlock();
    setRep(1);
    if (index >= queue.length - 1) {
      // 마지막 카드 — loop 시 처음으로, 아니면 완료
      if (loop) {
        setIndex(0);
        if (shuffle) setShuffleKey((k) => k + 1);
      } else {
        setFinished(true);
        setPlaying(false);
      }
      return;
    }
    setFinished(false);
    setPlaying(true);
    setIndex((i) => i + 1);
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
              <span className="text-xs text-muted">· {rep}/{repeats}회</span>
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

        {/* 표시 + 재생 방식 토글 — 카드 상단 */}
        <div className="mb-3 flex items-center justify-center gap-2 flex-wrap">
          {(["hanzi", "pinyin", "korean"] as const).map((k) => {
            const label = k === "hanzi" ? "한자" : k === "pinyin" ? "병음" : "한국어";
            const on = display[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDisplay({ [k]: !on })}
                aria-pressed={on}
                className={
                  "rounded-chip px-2.5 py-1 text-sm border " +
                  (on ? "bg-primary text-white border-primary" : "bg-surface text-fg border-divider")
                }
              >
                {label}
              </button>
            );
          })}
          <span className="text-divider mx-0.5">|</span>
          <button
            type="button"
            onClick={() => setLoop(!loop)}
            aria-pressed={loop}
            className={
              "inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-sm border " +
              (loop ? "bg-primary text-white border-primary" : "bg-surface text-fg border-divider")
            }
          >
            <Repeat size={14} aria-hidden />
            <span>반복 재생</span>
          </button>
          <button
            type="button"
            onClick={() => setShuffle(!shuffle)}
            aria-pressed={shuffle}
            className={
              "inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-sm border " +
              (shuffle ? "bg-primary text-white border-primary" : "bg-surface text-fg border-divider")
            }
          >
            <Shuffle size={14} aria-hidden />
            <span>무작위</span>
          </button>
        </div>

        {finished ? (
          <div className="card text-center py-8 min-h-[220px] flex flex-col justify-center items-center gap-2">
            <div className="text-success">
              <CheckCircle2 size={40} aria-hidden />
            </div>
            <div className="font-semibold text-lg">완료!</div>
            <div className="text-sm text-muted">
              {queue.length}개 · 총 {queue.length * Math.max(1, repeats)}회 재생
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  unlock();
                  setFinished(false);
                  setRep(1);
                  setIndex(0);
                  if (shuffle) setShuffleKey((k) => k + 1);
                  setPlaying(true);
                }}
                className="btn-ghost inline-flex items-center gap-1 border border-divider"
              >
                <RotateCcw size={14} aria-hidden />
                <span>다시</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/listen")}
                className="btn-primary"
              >
                설정으로
              </button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-6 min-h-[220px] flex flex-col justify-center">
            <div className="text-xs text-muted mb-2">
              {current ? lessonTitleFor(current) : ""} ·{" "}
              <span className="tabular-nums">
                {Math.min(index + 1, queue.length)}/{queue.length}
              </span>
            </div>

            <div
              className="h-1 mx-auto mb-3 w-full max-w-xs bg-divider/60 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={queue.length}
              aria-valuenow={Math.min(index + 1, queue.length)}
              aria-label="재생 진행률"
            >
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${queue.length === 0 ? 0 : (Math.min(index + 1, queue.length) / queue.length) * 100}%`,
                }}
              />
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
              <div className="mt-3 text-lg text-fg/80">{current.meaning}</div>
            ) : null}
          </div>
        )}

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
            {playing ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}
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
        <div className="mt-5 px-2">
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
          <span className="text-xs text-muted">카드 반복</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRepeats(repeats - 1)}
              disabled={repeats <= 1}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="카드 반복 횟수 감소"
            >
              −
            </button>
            <span className="tabular-nums w-6 text-center">{repeats}</span>
            <button
              type="button"
              onClick={() => setRepeats(repeats + 1)}
              disabled={repeats >= 10}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="카드 반복 횟수 증가"
            >
              +
            </button>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>

      </PageShell>
    </div>
  );
}

/**
 * 간체 + 병음 스택.
 *
 * 폰트 사이즈 비율:
 *   - 4글자 기준 간체 크기를 표준으로 사용 (text-5xl = 3rem)
 *   - 병음·뜻 = text-lg (1.125rem)
 */
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

  if (showPinyin && showHanzi && syllables) {
    let pi = 0;
    return (
      <div className="flex flex-wrap items-end justify-center gap-x-1 gap-y-2">
        {chars.map((c, i) => {
          const isHan = HANZI_RE.test(c);
          const syl = isHan ? syllables[pi++] : null;
          return (
            <div key={i} className="flex flex-col items-center">
              <span className="pinyin-text text-lg text-fg/80 min-h-[1.25rem]">
                {syl ?? ""}
              </span>
              <span className="hanzi-text text-5xl leading-none">{c}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {showPinyin ? (
        <div className="pinyin-text text-lg text-fg/80">{pinyin}</div>
      ) : null}
      {showHanzi ? (
        <div className="hanzi-text text-5xl mt-1">{word}</div>
      ) : null}
    </div>
  );
}
