import { useCallback, useRef } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

export function useTts() {
  const rate = useSettingsStore((s) => s.ttsRate);
  const gap = useSettingsStore((s) => s.ttsGap);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback(
    (text: string, lang = "zh-CN") => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = rate;
      return new Promise<void>((resolve) => {
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      });
    },
    [rate]
  );

  const speakSequence = useCallback(
    async (items: { text: string; lang?: string }[]) => {
      window.speechSynthesis.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const item of items) {
        await speak(item.text, item.lang ?? "zh-CN");
        await new Promise<void>((resolve) => {
          timerRef.current = setTimeout(() => {
            resolve();
          }, gap * 1000);
        });
      }
    },
    [speak, gap]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { speak, speakSequence, stop };
}
