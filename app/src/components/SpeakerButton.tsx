import { Volume2 } from "lucide-react";
import { speak } from "@/lib/tts";
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
  if (!payload) return null;
  return (
    <button
      type="button"
      onClick={() => speak(payload, { rate })}
      onContextMenu={(e) => {
        e.preventDefault();
        speak(payload, { rate: 0.5 });
      }}
      className={
        className ??
        "inline-flex items-center justify-center w-11 h-11 rounded-lg text-fg hover:bg-primary-soft active:bg-primary-soft"
      }
      aria-label={label}
      title="짧게: 일반 속도 · 길게(우클릭): 0.5×"
    >
      <Volume2 size={20} aria-hidden />
    </button>
  );
}
