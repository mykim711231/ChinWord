import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { cancelSpeak, speakAsync, unlock } from "@/lib/tts";
import { useSettings } from "@/state/settings";

/**
 * 우선순위:
 *   1. hanzi `text` 가 사전녹음 매니페스트에 있으면 mp3 재생 (zh-CN-XiaoxiaoNeural).
 *   2. 없으면 Web Speech 로 `text` 발화 (기기에 zh 음성팩이 있을 때 정상 동작).
 *   3. zh 음성팩이 없는 환경 폴백: `pinyin` 이 주어졌다면 Latin 으로 발화 — 발음은
 *      어색해도 한국어 한자음 fallback(Sino-Korean) 보다는 낫다.
 *
 * 과거에는 항상 pinyin 을 발화했지만, 사전녹음이 있는 단어는 본문(hanzi)을 직접
 * 합성한 신경망 음성이 훨씬 자연스러우므로 hanzi 가 primary 가 된다.
 *
 * 재생 중 시각 피드백 + 자체 stop:
 *  - 재생 중에는 정사각형(Stop) 아이콘과 강조 배경으로 상태 표시.
 *  - 두 번째 클릭은 새 재생을 큐잉하지 않고 현재 재생을 중단한다 (SMCB TTSButton
 *    동일 패턴). aria-pressed 로 스크린리더에도 라이브 상태 보고.
 */
export function SpeakerButton({
  text,
  pinyin,
  className,
  label = "발음 듣기",
}: {
  text: string;
  pinyin?: string;
  className?: string;
  label?: string;
}) {
  const rate = useSettings((s) => s.ttsRate);
  // pinyin 은 zh 음성팩 미설치 환경의 last-resort 폴백.
  // speak() 내부에서 manifest hit → mp3, miss → Web Speech 분기를 처리한다.
  // 여기서는 우선 hanzi 를 전달; 호출자가 pinyin 만 주고 hanzi 가 비면 그때만 pinyin.
  const payload = text || pinyin || "";
  const [speaking, setSpeaking] = useState(false);
  const acRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      acRef.current?.abort();
      cancelSpeak();
    };
  }, []);

  function fire(rateOverride?: number): void {
    unlock();
    // 재생 중 두 번째 클릭은 stop.
    if (speaking) {
      acRef.current?.abort();
      cancelSpeak();
      setSpeaking(false);
      return;
    }
    if (!payload) return;
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    setSpeaking(true);
    void speakAsync(payload, {
      rate: rateOverride ?? rate,
      signal: ac.signal,
    }).finally(() => {
      // 새 AC 가 이미 시작됐다면 상태 덮어쓰지 않음 — race-safe.
      if (acRef.current === ac) setSpeaking(false);
    });
  }

  if (!payload) return null;

  return (
    <button
      type="button"
      onClick={() => fire()}
      onContextMenu={(e) => {
        e.preventDefault();
        fire(0.5);
      }}
      className={
        className ??
        "inline-flex items-center justify-center w-11 h-11 rounded-lg text-fg hover:bg-primary-soft active:bg-primary-soft aria-pressed:bg-primary-soft"
      }
      aria-label={speaking ? "재생 중단" : label}
      aria-pressed={speaking}
      title="짧게: 일반 속도 · 길게(우클릭): 0.5× · 다시 클릭: 정지"
    >
      {speaking ? (
        <Square size={18} aria-hidden className="text-primary" />
      ) : (
        <Volume2 size={20} aria-hidden />
      )}
    </button>
  );
}
