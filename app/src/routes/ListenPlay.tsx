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
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue, lessonTitleFor } from "@/lib/content";
import { splitPinyin } from "@/lib/pinyin";
import { cancelSpeak, speakAsync, unlock } from "@/lib/tts";
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

  // settings 라이브 변경 시 현재 카드 재시작을 피하기 위해 ref 로 캡처.
  // (deps 에 넣으면 슬라이더 드래그 중 매 tick 마다 effect 재실행되어 카드가 끊김)
  const intervalRef = useRef(intervalSec);
  intervalRef.current = intervalSec;
  const repeatsRef = useRef(repeats);
  repeatsRef.current = repeats;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;

  // 현재 effect 가 들고 있는 AC. cleanup 으로 abort → in-flight speakAsync/wait
  // 가 즉시 풀려 정지/이전/다음/일시정지 가 무조건 즉시 반영된다.
  const acRef = useRef<AbortController | null>(null);

  const current = queue[index];

  // Empty queue guard
  useEffect(() => {
    if (queue.length === 0) navigate("/listen", { replace: true });
  }, [queue.length, navigate]);

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

  // Playback: "한 effect = 한 rep 의 한 카드 1회 재생".
  // 일시정지/이전/다음/카드끝 → setState → cleanup(ac.abort, cancelSpeak)
  // → in-flight speakAsync·wait 즉시 풀림 → 새 effect 가 새 카드를 재생.
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
      const entry = queue[index];
      // 한자를 보내야 사전녹음 매니페스트가 hit 되고 zh-CN-XiaoxiaoNeural
      // (표준 보통화) mp3 가 재생된다. 병음(라틴 문자)을 보내면 매니페스트 miss
      // → Web Speech 가 라틴 알파벳을 zh-CN 으로 읽으려 해서 발음이 엉뚱해진다.
      const phrase = entry.word || entry.pinyin;
      try {
        await speakAsync(phrase, {
          rate: rateRef.current,
          signal: ac.signal,
        });
      } catch {
        /* ignore */
      }
      if (ac.signal.aborted) return;

      // gap before next play
      await wait(intervalRef.current * 1000, ac);
      if (ac.signal.aborted) return;

      // auto-advance: 같은 카드 반복인지, 다음 카드인지
      if (rep < repeatsRef.current) {
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
    // ttsRate/intervalSec/repeats 는 의도적으로 deps 에서 제외 — ref 로 라이브 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, index, rep, playing, finished, wait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      acRef.current?.abort();
      cancelSpeak();
    };
  }, []);

  // 모든 핸들러는 단순 setState 만 호출 — useEffect cleanup 이 in-flight
  // speakAsync·wait 를 abort 시켜 즉시 풀어준다. 그리고 새 state 로 새 effect
  // 인스턴스가 시작되어 새 카드를 재생.
  function onTogglePlay() {
    // iOS Safari gesture lock: 첫 speak 호출은 사용자 제스처 동기 스택에서
    // 시작되어야 한다. setState → useEffect → speakAsync 는 비동기 경로라
    // 진입점에서 unlock() 으로 무음 utterance 1회 발사해 정책 충족.
    unlock();
    if (finished) {
      // restart from the beginning
      setFinished(false);
      setRep(1);
      setIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  // Prev/Next: functional setIndex 로 빠른 연타 시 동일 값 합쳐지지 않고
  // React queue 가 직전 값을 가져와 정확히 ±1 씩 누적. ±2 점프 race 도 없음
  // (loop 는 자동 advance 가 없어졌으므로 setIndex 호출처가 단일화).
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

        {finished ? (
          // 완료 카드 — 작은 자막 한 줄로 묻혀버리는 대신 명시적 종료 화면.
          // 사용자가 "끝났구나" 를 즉시 인지하고 다시/돌아가기 중 선택할 수 있게.
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

            {/* progress bar — 위치 인지 + 끝까지 얼마 남았는지 시각화 */}
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
                  width: `${
                    queue.length === 0
                      ? 0
                      : (Math.min(index + 1, queue.length) / queue.length) * 100
                  }%`,
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
              <div className="mt-3 text-sm text-fg/80">{current.meaning}</div>
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
