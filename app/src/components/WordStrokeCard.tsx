import { useEffect, useMemo, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { Play, RotateCw, Square, Volume2, VolumeX } from "lucide-react";
import { cancelSpeak, speakAsync, unlock } from "@/lib/tts";
import { useSettings } from "@/state/settings";

/**
 * Plays stroke order for a multi-character word as a single sequence —
 * character 1 → character 2 → … — like writing the word on paper.
 *
 * Audio sync: when `audio` is enabled, each character's *hanzi* is spoken in
 * parallel with its stroke animation (dual-coding). build-tts 가 단음절 한자를
 * 매니페스트에 포함하므로 hit 시 zh-CN-XiaoxiaoNeural mp3 가 그대로 재생된다.
 * miss 시 Web Speech 폴백 — 기기에 zh 음성팩이 있으면 정상, 없으면 한국어 한자음
 * 으로 떨어지는 silent quality fail 가능 (현재 자료는 단음절 한자도 전량 매니페스트
 * 등록이므로 정상 빌드 환경에서는 발생하지 않음).
 *
 * Props:
 *  - `pinyin` / `pinyinPerChar` — 발화에는 더 이상 사용하지 않으나 (hanzi 우선)
 *    상위 화면 호환을 위해 시그니처는 유지. 향후 표시·정렬용으로 활용 가능.
 */
const MIN_CHAR_SIZE = 56;
const CHAR_GAP = 8;

export function WordStrokeCard({
  word,
  pinyin,
  pinyinPerChar,
  charSize: maxCharSize = 88,
}: {
  word: string;
  pinyin?: string;
  pinyinPerChar?: string[];
  /** Maximum size per character; actual size adapts to fit all chars on one row. */
  charSize?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const writersRef = useRef<HanziWriter[]>([]);
  const cancelledRef = useRef(false);
  const loopRef = useRef(false);
  const audioCtrlRef = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerW, setContainerW] = useState(0);
  const ttsRate = useSettings((s) => s.ttsRate);

  // Keep latest values in refs so playSequence (long-running async) sees them
  // without re-creating on each render.
  const audioOnRef = useRef(audioOn);
  audioOnRef.current = audioOn;
  const rateRef = useRef(ttsRate);
  rateRef.current = ttsRate;

  const hanziChars = useMemo(
    () => Array.from(word).filter((c) => /\p{Script=Han}/u.test(c)),
    [word],
  );

  // Adaptive charSize: fit all hanzi on a single row, capped by maxCharSize.
  const charSize = useMemo(() => {
    const n = hanziChars.length;
    if (n === 0 || containerW === 0) return maxCharSize;
    const avail = containerW - CHAR_GAP * (n - 1);
    const size = Math.floor(avail / n);
    return Math.max(MIN_CHAR_SIZE, Math.min(maxCharSize, size));
  }, [containerW, hanziChars.length, maxCharSize]);

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

  // pinyinPerChar / pinyin 는 더 이상 발화 입력으로 쓰이지 않는다 — 단음절 한자를
  // 직접 발화하면 매니페스트 hit 으로 신경망 음성이 재생되기 때문이다. 시그니처는
  // 호환을 위해 유지.
  void pinyin;
  void pinyinPerChar;

  useEffect(() => {
    const root = rowRef.current;
    if (!root || hanziChars.length === 0 || charSize < MIN_CHAR_SIZE) return;
    root.innerHTML = "";
    writersRef.current = [];
    cancelledRef.current = false;
    setError(null);
    // 카드 전환/언마운트 후 fetch 가 resolve 되어도 setError 호출 차단. (P1 S-05)
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
      // auto play once
      void playSequence();
    } catch (e) {
      setError(String((e as Error).message || e));
    }

    return () => {
      mounted = false;
      cancelledRef.current = true;
      loopRef.current = false;
      audioCtrlRef.current?.abort();
      audioCtrlRef.current = null;
      cancelSpeak();
      // 언마운트 시 진행 중인 stroke animation 도 중단 — animateOne 의 onComplete
      // 콜백이 unmounted state 에서 호출되더라도 부수효과 없음(Promise 만 resolve).
      for (const w of writersRef.current) {
        try {
          w.hideCharacter();
        } catch {
          /* ignore */
        }
      }
      writersRef.current = [];
    };
    // playSequence captured fresh each effect run via closure over refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hanziChars.join(""), charSize]); // charSize change → re-mount canvases

  // abort signal 을 받아 진행 중 stroke animation 을 중단 가능하도록 한다.
  // hanzi-writer 의 animateCharacter 는 cancel API 가 없으므로 hideCharacter() 로
  // 즉시 stop — onComplete 콜백은 결국 호출되지만 이미 resolve 한 후라 무영향.
  function animateOne(w: HanziWriter, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
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
    });
  }

  // abort-aware sleep — breath gap 도중 정지/언마운트 시 즉시 깨어남
  function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(t);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  async function playSequence() {
    if (writersRef.current.length === 0) return;
    cancelledRef.current = false;
    audioCtrlRef.current?.abort();
    const ac = new AbortController();
    audioCtrlRef.current = ac;
    setPlaying(true);
    do {
      for (const w of writersRef.current) w.hideCharacter();
      for (let i = 0; i < writersRef.current.length; i++) {
        if (cancelledRef.current || ac.signal.aborted) break;
        const w = writersRef.current[i];
        // 단음절 한자를 발화 — 매니페스트 hit 으로 신경망 음성 재생, miss 시
        // Web Speech 폴백. 사전녹음이 한자 1자 단위로 만들어져 있으므로
        // 필순 1글자 ↔ mp3 1개로 정확히 정렬된다.
        const ch = hanziChars[i];
        const audio =
          audioOnRef.current && ch
            ? speakAsync(ch, { rate: rateRef.current, signal: ac.signal })
            : Promise.resolve();
        const anim = animateOne(w, ac.signal);
        await Promise.all([audio, anim]);
        if (cancelledRef.current || ac.signal.aborted) break;
        // breath gap between characters — abort-aware
        if (i < writersRef.current.length - 1) {
          await abortableSleep(150, ac.signal);
        }
      }
      if (cancelledRef.current || ac.signal.aborted) break;
      // Whole-word recap (multi-char 단어만) — 본문 단어 mp3 가 보통 매니페스트에
      // 있으므로 자연스러운 신경망 음성으로 한 번 더 재생.
      if (audioOnRef.current && writersRef.current.length > 1 && word) {
        await abortableSleep(200, ac.signal);
        if (cancelledRef.current || ac.signal.aborted) break;
        await speakAsync(word, {
          rate: rateRef.current,
          signal: ac.signal,
        });
      }
      if (loopRef.current && !cancelledRef.current && !ac.signal.aborted) {
        await abortableSleep(400, ac.signal);
      }
    } while (loopRef.current && !cancelledRef.current && !ac.signal.aborted);
    setPlaying(false);
  }

  function onPlay() {
    // iOS Safari gesture lock — TTS 가 사용자 제스처 동기 호출 스택 안에서 시작
    // 되어야 하므로 진입점에서 즉시 unlock().
    unlock();
    if (playing) {
      cancelledRef.current = true;
      loopRef.current = false;
      setLooping(false);
      audioCtrlRef.current?.abort();
      cancelSpeak();
      return;
    }
    void playSequence();
  }

  function onLoop() {
    unlock();
    const next = !looping;
    setLooping(next);
    loopRef.current = next;
    if (next && !playing) void playSequence();
  }

  function onToggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    if (!next) {
      audioCtrlRef.current?.abort();
      cancelSpeak();
      const ac = new AbortController();
      audioCtrlRef.current = ac;
    }
  }

  if (hanziChars.length === 0) return null;

  return (
    <div className="card flex flex-col items-center gap-2 p-3">
      <div ref={containerRef} className="w-full overflow-hidden">
        <div
          ref={rowRef}
          className="flex items-center justify-center gap-2 flex-nowrap"
          style={{ minHeight: charSize }}
        />
      </div>
      {error ? (
        <div className="text-xs text-muted">{error}</div>
      ) : (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onPlay}
            aria-pressed={playing}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-divider hover:bg-primary-soft"
          >
            {playing ? (
              <>
                <Square size={12} aria-hidden />
                <span>정지</span>
              </>
            ) : (
              <>
                <Play size={12} aria-hidden />
                <span>쓰기</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onLoop}
            aria-pressed={looping}
            className={
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border " +
              (looping
                ? "border-primary text-primary"
                : "border-divider hover:bg-primary-soft")
            }
          >
            <RotateCw size={12} aria-hidden />
            <span>반복</span>
          </button>
          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={audioOn}
            aria-label={audioOn ? "음성 동기 끄기" : "음성 동기 켜기"}
            className={
              "inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border " +
              (audioOn
                ? "border-primary text-primary"
                : "border-divider hover:bg-primary-soft")
            }
          >
            {audioOn ? (
              <Volume2 size={12} aria-hidden />
            ) : (
              <VolumeX size={12} aria-hidden />
            )}
            <span>음성</span>
          </button>
        </div>
      )}
    </div>
  );
}
