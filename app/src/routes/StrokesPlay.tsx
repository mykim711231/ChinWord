import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HanziWriter from "hanzi-writer";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  PenLine,
  X,
  Minus,
  Plus,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Repeat,
  Shuffle,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { cancelSpeak, speakAsync, speakKoreanAsync, unlock } from "@/lib/tts";
import { useListen } from "@/state/listen";
import { useSettings } from "@/state/settings";

const HANZI_RE = /\p{Script=Han}/u;

/**
 * 4글자 기준 간체 사이즈를 표준으로 사용.
 * 컨테이너 너비에 4글자가 들어가는 크기가 기본 → 글자 수 관계없이 동일 크기 유지.
 * 최소 56px, 최대 120px.
 */
const STD_CHARS = 4;
const MAX_CHAR_SIZE = 120;
const MIN_CHAR_SIZE = 56;
const CHAR_GAP = 8;

function hasHanzi(s: string): boolean {
  return Array.from(s).some((c) => HANZI_RE.test(c));
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StrokesPlay(): JSX.Element {
  const navigate = useNavigate();
  const {
    scope, area, display, strokeRepeats, loop, shuffle,
    setDisplay, setStrokeRepeats, setLoop, setShuffle,
  } = useListen();
  const ttsRate = useSettings((s) => s.ttsRate);

  const rawQueue = useMemo(
    () => buildListenQueue({ scope, area }).filter((e) => hasHanzi(e.word)),
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
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const strokeRepeatsRef = useRef(strokeRepeats);
  strokeRepeatsRef.current = strokeRepeats;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const displayRef = useRef(display);
  displayRef.current = display;

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const writersRef = useRef<HanziWriter[]>([]);
  const acRef = useRef<AbortController | null>(null);
  const [containerW, setContainerW] = useState(0);

  const current = queue[index];
  const hanziChars = useMemo(
    () => (current ? Array.from(current.word).filter((c) => HANZI_RE.test(c)) : []),
    [current],
  );

  // 4글자 기준 사이즈 계산 — 실제 글자 수와 관계없이 동일 크기 유지
  const charSize = useMemo(() => {
    if (containerW === 0) return MAX_CHAR_SIZE;
    const avail = containerW - CHAR_GAP * (STD_CHARS - 1);
    const size = Math.floor(avail / STD_CHARS);
    return Math.max(MIN_CHAR_SIZE, Math.min(MAX_CHAR_SIZE, size));
  }, [containerW]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (queue.length === 0) navigate("/strokes", { replace: true });
  }, [queue.length, navigate]);

  const animateOne = useCallback(
    (w: HanziWriter, signal: AbortSignal): Promise<void> =>
      new Promise((resolve) => {
        if (signal.aborted) return resolve();
        let resolved = false;
        const onAbort = () => {
          if (resolved) return;
          resolved = true;
          try { w.hideCharacter(); } catch { /* ignore */ }
          resolve();
        };
        signal.addEventListener("abort", onAbort, { once: true });
        w.animateCharacter({
          onComplete: () => {
            if (resolved) return;
            resolved = true;
            signal.removeEventListener("abort", onAbort);
            resolve();
          },
        });
      }),
    [],
  );

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

  // Build HanziWriter instances
  useEffect(() => {
    const root = rowRef.current;
    if (!root || hanziChars.length === 0 || charSize < MIN_CHAR_SIZE) return;
    root.innerHTML = "";
    writersRef.current = [];
    setError(null);
    setReady(false);
    let mounted = true;

    const slots = hanziChars.map((ch) => {
      const slot = document.createElement("div");
      slot.style.width = `${charSize}px`;
      slot.style.height = `${charSize}px`;
      slot.style.background = "#FFFFFF";
      slot.style.borderRadius = "8px";
      slot.style.flex = "0 0 auto";
      slot.setAttribute("aria-label", `${ch} 필순`);
      slot.setAttribute("role", "img");
      root.appendChild(slot);
      return slot;
    });

    try {
      writersRef.current = slots.map((slot, i) =>
        HanziWriter.create(slot, hanziChars[i], {
          width: charSize,
          height: charSize,
          padding: 4,
          strokeAnimationSpeed: 1.2,
          delayBetweenStrokes: 100,
          showOutline: true,
          showCharacter: false,
          strokeColor: "#DC2626",
          outlineColor: "#E5E7EB",
          radicalColor: "#F59E0B",
          charDataLoader: (charToLoad, onComplete, onError) => {
            const url =
              `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/` +
              `${encodeURIComponent(charToLoad)}.json`;
            fetch(url)
              .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              })
              .then((data) => {
                if (!mounted) return;
                onComplete(data);
              })
              .catch((e) => {
                if (!mounted) return;
                setError("필순 데이터를 불러오지 못했습니다");
                onError?.(e);
              });
          },
        }),
      );
      setReady(true);
    } catch (e) {
      setError(String((e as Error).message || e));
      setReady(false);
    }

    return () => {
      mounted = false;
      writersRef.current = [];
    };
  }, [hanziChars.join(""), charSize]);

  // Playback effect
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
      let tries = 0;
      while (writersRef.current.length === 0 && !ac.signal.aborted && tries < 30) {
        await new Promise((r) => setTimeout(r, 80));
        tries++;
      }
      if (ac.signal.aborted) return;
      if (writersRef.current.length === 0) {
        setRep(1);
        setIndex((n) => n + 1);
        return;
      }

      const writers = writersRef.current;
      for (const w of writers) {
        try { w.hideCharacter(); } catch { /* ignore */ }
      }

      for (let i = 0; i < writers.length; i++) {
        if (ac.signal.aborted) return;
        const w = writers[i];
        const ch = hanziChars[i];
        const audio = ch
          ? speakAsync(ch, { rate: rateRef.current, signal: ac.signal }).catch(() => {})
          : Promise.resolve();
        const anim = animateOne(w, ac.signal);
        await Promise.all([audio, anim]);
        if (ac.signal.aborted) return;
        if (i < writers.length - 1) {
          await wait(120, ac);
          if (ac.signal.aborted) return;
        }
      }

      // Whole-word recap
      if (writers.length > 1 && current?.word) {
        await wait(200, ac);
        if (ac.signal.aborted) return;
        await speakAsync(current.word, { rate: rateRef.current, signal: ac.signal }).catch(() => {});
        if (ac.signal.aborted) return;
      }

      // 한국어 뜻 읽기 (korean 표시 활성 시)
      if (displayRef.current.korean && current?.meaning) {
        await wait(300, ac);
        if (ac.signal.aborted) return;
        await speakKoreanAsync(current.meaning, { rate: 1.0, signal: ac.signal }).catch(() => {});
        if (ac.signal.aborted) return;
      }

      await wait(500, ac);
      if (ac.signal.aborted) return;

      if (rep < strokeRepeatsRef.current) {
        setRep((r) => r + 1);
      } else {
        setRep(1);
        setIndex((n) => n + 1);
      }
    };

    void run();
    return () => { ac.abort(); cancelSpeak(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index, rep, playing, finished, animateOne, wait]);

  useEffect(() => () => { acRef.current?.abort(); cancelSpeak(); }, []);

  function onTogglePlay() {
    unlock();
    if (finished) {
      setFinished(false);
      setIndex(0);
      setRep(1);
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
    navigate("/strokes");
  }

  if (queue.length === 0) {
    return (
      <PageShell>
        <div className="text-center text-muted mt-12">학습할 항목이 없습니다.</div>
      </PageShell>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-primary-soft/40">
      <PageShell>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 text-primary font-semibold">
            <PenLine size={16} aria-hidden />
            <span>필순</span>
            {strokeRepeats > 1 ? (
              <span className="text-xs text-muted">· {rep}/{strokeRepeats}회</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onExit}
            className="btn-ghost text-sm inline-flex items-center gap-1"
            aria-label="필순 종료"
          >
            <X size={14} aria-hidden />
            <span>종료</span>
          </button>
        </div>

        {/* 표시 + 재생 방식 토글 — 카드 상단 */}
        <div className="mb-3 flex items-center justify-center gap-2 flex-wrap">
          {(["pinyin", "korean"] as const).map((k) => {
            const label = k === "pinyin" ? "병음" : "한국어";
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
              {queue.length}개 · 총 {queue.length * Math.max(1, strokeRepeats)}회 재생
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  unlock();
                  setFinished(false);
                  setIndex(0);
                  setRep(1);
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
                onClick={() => navigate("/strokes")}
                className="btn-primary"
              >
                설정으로
              </button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-4">
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
              aria-label="필순 진행률"
            >
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${queue.length === 0 ? 0 : (Math.min(index + 1, queue.length) / queue.length) * 100}%`,
                }}
              />
            </div>

            <div ref={containerRef} className="w-full overflow-hidden relative">
              <div
                ref={rowRef}
                className="flex items-center justify-center gap-2 flex-nowrap"
                style={{ minHeight: charSize }}
              />
              {!ready && !error ? (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 size={20} aria-hidden className="animate-spin" />
                  <span className="sr-only">필순 준비 중</span>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="text-xs text-muted mt-2">{error}</div>
            ) : null}

            {/* 병음·뜻 — text-2xl (1.5rem) */}
            {display.pinyin && current ? (
              <div className="pinyin-text text-2xl text-fg/80 mt-3">
                {current.pinyin}
              </div>
            ) : null}
            {display.korean && current ? (
              <div className="mt-1 text-2xl text-fg/80">{current.meaning}</div>
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

        {/* Inline repeat control */}
        <div className="mt-5 flex items-center justify-between px-2">
          <span className="text-xs text-muted">카드 반복</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStrokeRepeats(strokeRepeats - 1)}
              disabled={strokeRepeats <= 1}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="카드 반복 횟수 감소"
            >
              <Minus size={12} aria-hidden />
            </button>
            <span className="tabular-nums w-6 text-center">{strokeRepeats}</span>
            <button
              type="button"
              onClick={() => setStrokeRepeats(strokeRepeats + 1)}
              disabled={strokeRepeats >= 10}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="카드 반복 횟수 증가"
            >
              <Plus size={12} aria-hidden />
            </button>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>

      </PageShell>
    </div>
  );
}
