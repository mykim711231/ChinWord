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
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { cancelSpeak, speakAsync, unlock } from "@/lib/tts";
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
  /** writers 가 mount 되어 캔버스가 준비되었는지 — 첫 카드/카드 전환 직후 잠깐 false. */
  const [ready, setReady] = useState(false);

  // settings 라이브 변경 시 현재 카드 재시작을 피하기 위해 ref 로 캡처.
  // (deps 에 넣으면 슬라이더/스피너 조작 중 매 tick 마다 effect 재실행되어 카드가 끊김)
  const strokeRepeatsRef = useRef(strokeRepeats);
  strokeRepeatsRef.current = strokeRepeats;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const writersRef = useRef<HanziWriter[]>([]);
  // 현재 effect 가 들고 있는 AC. cleanup 으로 abort →
  // in-flight speakAsync·animateOne·wait 가 즉시 풀려
  // 정지/이전/다음/일시정지 가 무조건 즉시 반영된다.
  const acRef = useRef<AbortController | null>(null);
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

  /** Abort-aware sleep — resolves on timeout 또는 ac.signal.abort. */
  const wait = useCallback(
    (ms: number, ac: AbortController): Promise<void> =>
      new Promise((resolve) => {
        if (ac.signal.aborted) return resolve();
        const t = setTimeout(() => {
          ac.signal.removeEventListener("abort", onAbort);
          resolve();
        }, ms);
        const onAbort = (): void => {
          clearTimeout(t);
          resolve();
        };
        ac.signal.addEventListener("abort", onAbort, { once: true });
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
    setReady(false);
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

  // Playback: "한 effect = 한 rep 의 한 카드 1회 재생".
  // 일시정지/이전/다음/카드끝 → setState → cleanup(ac.abort, cancelSpeak)
  // → in-flight speakAsync·animateOne·wait 즉시 풀림 → 새 effect 가 새 카드를 재생.
  // 이 단순화로 prev/next 무반응 + audio bleed-through 가 모두 해소된다.
  useEffect(() => {
    if (queue.length === 0) return;
    if (!playing) return;
    if (finished) return;
    if (index >= queue.length) {
      setFinished(true);
      setPlaying(false);
      return;
    }

    const ac = new AbortController();
    acRef.current = ac;

    const run = async (): Promise<void> => {
      // Wait briefly for writers to mount for this card.
      // 새 카드 진입 시 writers useEffect 가 먼저 돌지만 HanziWriter.create 가
      // charDataLoader fetch 를 기다리는 동안 writersRef 는 채워져 있다.
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
        // 데이터 에러로 writer 가 안 잡힘 → 이 카드 건너뜀
        setRep(1);
        setIndex((n) => n + 1);
        return;
      }

      const writers = writersRef.current;
      for (const w of writers) {
        try {
          w.hideCharacter();
        } catch {
          /* ignore */
        }
      }

      // 글자별 필순 + 발화. 한자(hanziChars[i])를 보내야 매니페스트 hit →
      // zh-CN-XiaoxiaoNeural mp3 재생. 병음 음절을 보내면 라틴 알파벳을 zh 로
      // 읽으려 해 발음이 엉뚱해진다.
      for (let i = 0; i < writers.length; i++) {
        if (ac.signal.aborted) return;
        const w = writers[i];
        const ch = hanziChars[i];
        const audio = ch
          ? speakAsync(ch, { rate: rateRef.current, signal: ac.signal }).catch(
              () => {},
            )
          : Promise.resolve();
        const anim = animateOne(w, ac.signal);
        await Promise.all([audio, anim]);
        if (ac.signal.aborted) return;
        if (i < writers.length - 1) {
          await wait(120, ac);
          if (ac.signal.aborted) return;
        }
      }

      // Whole-word recap (multi-char 단어만) — WordStrokeCard 와 동일 패턴.
      // 글자별 재생이 끝난 후 단어 전체를 한 번 더 발화.
      if (writers.length > 1 && current?.word) {
        await wait(200, ac);
        if (ac.signal.aborted) return;
        await speakAsync(current.word, {
          rate: rateRef.current,
          signal: ac.signal,
        }).catch(() => {});
        if (ac.signal.aborted) return;
      }

      // breath between reps
      await wait(500, ac);
      if (ac.signal.aborted) return;

      // auto-advance: 같은 카드 반복인지, 다음 카드인지
      if (rep < strokeRepeatsRef.current) {
        setRep((r) => r + 1);
      } else {
        setRep(1);
        setIndex((n) => n + 1);
      }
    };

    void run();

    return () => {
      ac.abort();
      cancelSpeak();
    };
    // strokeRepeats/ttsRate 는 의도적으로 deps 에서 제외 — ref 로 라이브 반영.
    // hanziChars/current 는 index 로부터 파생되므로 index 만 deps 에 포함.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index, rep, playing, finished, animateOne, wait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      acRef.current?.abort();
      cancelSpeak();
    };
  }, []);

  // 모든 핸들러는 단순 setState 만 호출 — useEffect cleanup 이 in-flight
  // speakAsync·animateOne·wait 를 abort 시켜 즉시 풀어준다. 그리고 새 state
  // 로 새 effect 인스턴스가 시작되어 새 카드를 재생.
  function onTogglePlay() {
    // iOS Safari gesture lock 해제 — onTogglePlay/Prev/Next 모두 진입점에서 1회.
    unlock();
    if (finished) {
      setFinished(false);
      setIndex(0);
      setRep(1);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  // Prev/Next: functional setIndex 로 빠른 연타 시 동일 값 합쳐지지 않고
  // React queue 가 직전 값을 가져와 정확히 ±1 씩 누적.
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
    setFinished(false);
    setPlaying(true);
    setIndex((i) => Math.min(queue.length, i + 1));
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

        {finished ? (
          // 완료 카드 — 명시적 종료 상태. 작은 자막 한 줄로 묻혀버리지 않게.
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

            {/* 진행률 — 카드 위치 + 끝까지 얼마 남았는지 시각화 */}
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
                  width: `${
                    queue.length === 0
                      ? 0
                      : (Math.min(index + 1, queue.length) / queue.length) * 100
                  }%`,
                }}
              />
            </div>

            {display.hanzi ? (
              <div ref={containerRef} className="w-full overflow-hidden relative">
                <div
                  ref={rowRef}
                  className="flex items-center justify-center gap-2 flex-nowrap"
                  style={{ minHeight: charSize }}
                />
                {/* 첫 카드 / 카드 전환 직후 writers mount 전 잠깐 보이는 spinner.
                    데이터 fetch 가 끝나기 전 카드가 비어 있는 듯한 인상을 막는다. */}
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
            ) : (
              <div className="text-muted text-sm py-6">
                표시 토글에서 '한자'를 켜야 캔버스가 보입니다.
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

      </PageShell>
    </div>
  );
}
