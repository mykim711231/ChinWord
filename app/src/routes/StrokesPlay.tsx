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
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { splitPinyin } from "@/lib/pinyin";
import { cancelSpeak, speakAsync } from "@/lib/tts";
import { useListen } from "@/state/listen";
import { useSettings } from "@/state/settings";

const HANZI_RE = /\p{Script=Han}/u;
const MAX_CHAR_SIZE = 160;
const MIN_CHAR_SIZE = 56;
const CHAR_GAP = 8; // matches Tailwind gap-2

function hasHanzi(s: string): boolean {
  return Array.from(s).some((c) => HANZI_RE.test(c));
}

export default function StrokesPlay(): JSX.Element {
  const navigate = useNavigate();
  const { scope, area, display, strokeRepeats, setStrokeRepeats } = useListen();
  const ttsRate = useSettings((s) => s.ttsRate);

  // Filter queue to entries that actually have at least one hanzi
  const queue = useMemo(
    () => buildListenQueue({ scope, area }).filter((e) => hasHanzi(e.word)),
    [scope, area],
  );

  const [index, setIndex] = useState(0);
  const [rep, setRep] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live refs so the long-running loop sees current state
  const indexRef = useRef(index);
  indexRef.current = index;
  const repRef = useRef(rep);
  repRef.current = rep;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const strokeRepeatsRef = useRef(strokeRepeats);
  strokeRepeatsRef.current = strokeRepeats;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const writersRef = useRef<HanziWriter[]>([]);
  const acRef = useRef<AbortController | null>(null);
  const advanceRef = useRef<(() => void) | null>(null);
  // Prev/Next 가 target index 를 미리 적어두면 loop 가 그 값으로 setIndex 한다.
  // (P1 L-05 와 동일한 race 방지 패턴 — handler + loop 가 모두 setIndex 하면 ±2 점프)
  const pendingJumpRef = useRef<number | null>(null);
  const [containerW, setContainerW] = useState(0);

  const current = queue[index];
  const hanziChars = useMemo(
    () => (current ? Array.from(current.word).filter((c) => HANZI_RE.test(c)) : []),
    [current],
  );

  // Compute char size that fits all hanzi of the current card on one row.
  // Recomputed when container width or card char count changes.
  const charSize = useMemo(() => {
    const n = hanziChars.length;
    if (n === 0 || containerW === 0) return MAX_CHAR_SIZE;
    const avail = containerW - CHAR_GAP * (n - 1);
    const size = Math.floor(avail / n);
    return Math.max(MIN_CHAR_SIZE, Math.min(MAX_CHAR_SIZE, size));
  }, [containerW, hanziChars.length]);

  // Measure container width (parent of writer row). Width depends only on
  // page layout, NOT on the writer slots, so there is no resize feedback loop.
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
  const syllables = useMemo<string[] | null>(() => {
    if (!current) return null;
    return splitPinyin(current.pinyin, hanziChars.length);
  }, [current, hanziChars.length]);

  // Empty queue → bounce back
  useEffect(() => {
    if (queue.length === 0) navigate("/strokes", { replace: true });
  }, [queue.length, navigate]);

  // Helper: animate a single writer to completion
  const animateOne = useCallback(
    (w: HanziWriter, signal: AbortSignal): Promise<void> =>
      new Promise((resolve) => {
        if (signal.aborted) return resolve();
        let resolved = false;
        const onAbort = () => {
          if (resolved) return;
          resolved = true;
          try {
            w.hideCharacter();
          } catch {
            /* ignore */
          }
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

  /** Sleep that resolves early on abort or external advance trigger. */
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

  // Build / rebuild HanziWriter instances whenever current card or sizing changes
  useEffect(() => {
    const root = rowRef.current;
    if (!root || hanziChars.length === 0 || charSize < MIN_CHAR_SIZE) return;
    root.innerHTML = "";
    writersRef.current = [];
    setError(null);
    // 카드 전환 시 진행 중인 charDataLoader fetch 가 resolve 되면 unmounted state
    // 에서 setError 가 호출될 수 있다. mounted flag 로 차단. (P1 S-03)
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
    } catch (e) {
      setError(String((e as Error).message || e));
    }

    return () => {
      mounted = false;
      writersRef.current = [];
    };
  }, [hanziChars.join(""), charSize]);

  // Master playback loop — restarts when queue identity changes
  useEffect(() => {
    if (queue.length === 0) return;
    acRef.current?.abort();
    cancelSpeak();
    const ac = new AbortController();
    acRef.current = ac;
    let cancelled = false;

    const runOnePass = async (): Promise<void> => {
      const writers = writersRef.current;
      if (writers.length === 0) return;
      // hide all then redraw
      for (const w of writers) w.hideCharacter();
      for (let i = 0; i < writers.length; i++) {
        if (ac.signal.aborted) return;
        const w = writers[i];
        const syl = syllables ? syllables[i] : null;
        const audio = syl
          ? speakAsync(syl, { rate: rateRef.current, signal: ac.signal }).catch(
              () => {},
            )
          : Promise.resolve();
        const anim = animateOne(w, ac.signal);
        await Promise.all([audio, anim]);
        if (ac.signal.aborted) return;
        if (i < writers.length - 1) {
          await new Promise((r) => setTimeout(r, 120));
        }
      }
    };

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

        // Wait briefly for writers to mount for this card
        let tries = 0;
        while (
          writersRef.current.length === 0 &&
          !ac.signal.aborted &&
          tries < 30
        ) {
          await new Promise((r) => setTimeout(r, 80));
          tries++;
        }
        if (ac.signal.aborted) return;
        if (writersRef.current.length === 0) {
          // No writers (data error?) — skip this card
          setIndex((n) => n + 1);
          setRep(1);
          continue;
        }

        await runOnePass();
        if (ac.signal.aborted) return;
        if (!playingRef.current) continue;

        // breath between reps
        const breath = await wait(500, ac);
        if (ac.signal.aborted) return;
        if (!playingRef.current && breath === "timeout") continue;

        // Prev/Next 처리: handler 가 pendingJumpRef 설정 + advanceRef fire →
        // wait 가 "advanced" 반환. 여기서 setIndex 를 한 번만 호출해 ±2 점프 방지.
        if (pendingJumpRef.current !== null) {
          const target = pendingJumpRef.current;
          pendingJumpRef.current = null;
          setRep(1);
          setIndex(target);
          continue;
        }

        if (repRef.current < strokeRepeatsRef.current) {
          setRep((r) => r + 1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, animateOne, wait, syllables?.join("|")]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      acRef.current?.abort();
      cancelSpeak();
    };
  }, []);

  function hideAllWriters() {
    for (const w of writersRef.current) {
      try {
        w.hideCharacter();
      } catch {
        /* ignore */
      }
    }
  }

  function onTogglePlay() {
    if (finished) {
      setFinished(false);
      setIndex(0);
      setRep(1);
      setPlaying(true);
      return;
    }
    // 명시적 next 계산 — L-01 동일 패턴
    const next = !playingRef.current;
    playingRef.current = next;
    setPlaying(next);
    if (!next) {
      // pausing → speech + animation 즉시 중단
      cancelSpeak();
      hideAllWriters();
    }
  }

  function jumpTo(targetIndex: number) {
    pendingJumpRef.current = Math.max(0, Math.min(queue.length, targetIndex));
    setRep(1);
    setFinished(false);
    playingRef.current = true;
    setPlaying(true);
    cancelSpeak();
    hideAllWriters();
    advanceRef.current?.();
  }

  function onPrev() {
    jumpTo(indexRef.current - 1);
  }

  function onNext() {
    jumpTo(indexRef.current + 1);
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
              <span className="text-xs text-muted">
                · {rep}/{strokeRepeats}회
              </span>
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

        <div className="card text-center py-4">
          <div className="text-xs text-muted mb-2">
            {current ? lessonTitleFor(current) : ""} ·{" "}
            <span className="tabular-nums">
              {Math.min(index + 1, queue.length)}/{queue.length}
            </span>
          </div>

          {display.hanzi ? (
            <div ref={containerRef} className="w-full overflow-hidden">
              <div
                ref={rowRef}
                className="flex items-center justify-center gap-2 flex-nowrap"
                style={{ minHeight: charSize }}
              />
            </div>
          ) : (
            <div className="text-muted text-sm py-6">
              표시 토글에서 ‘한자’를 켜야 캔버스가 보입니다.
            </div>
          )}

          {error ? (
            <div className="text-xs text-muted mt-2">{error}</div>
          ) : null}

          {display.pinyin && current ? (
            <div className="pinyin-text text-sm text-fg/80 mt-3">
              {current.pinyin}
            </div>
          ) : null}
          {display.korean && current ? (
            <div className="mt-1 text-sm text-fg/80">{current.meaning}</div>
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

        {/* Inline repeat control */}
        <div className="mt-6 flex items-center justify-between px-2">
          <span className="text-xs text-muted">반복</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStrokeRepeats(strokeRepeats - 1)}
              disabled={strokeRepeats <= 1}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 감소"
            >
              <Minus size={12} aria-hidden />
            </button>
            <span className="tabular-nums w-6 text-center">{strokeRepeats}</span>
            <button
              type="button"
              onClick={() => setStrokeRepeats(strokeRepeats + 1)}
              disabled={strokeRepeats >= 10}
              className="w-8 h-8 rounded-md border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 증가"
            >
              <Plus size={12} aria-hidden />
            </button>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>

        {finished ? (
          <div className="mt-4 text-center text-sm text-primary">
            완료 — 다시 시작하려면 ▶ 버튼을 누르세요.
          </div>
        ) : null}
      </PageShell>
    </div>
  );
}
