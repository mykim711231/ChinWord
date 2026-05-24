import { speak } from "@/lib/tts";
import { useSettings } from "@/state/settings";

export function SpeakerButton({
  text,
  className,
  label = "발음 듣기",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const rate = useSettings((s) => s.ttsRate);
  return (
    <button
      type="button"
      onClick={() => speak(text, { rate })}
      onContextMenu={(e) => {
        e.preventDefault();
        speak(text, { rate: 0.5 });
      }}
      className={
        className ??
        "btn-ghost text-xl aria-pressed:bg-primary-soft"
      }
      aria-label={label}
      title="짧게: 일반 속도 · 길게(우클릭): 0.5×"
    >
      🔊
    </button>
  );
}
