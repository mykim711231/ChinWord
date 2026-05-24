/** Web Speech API TTS helper for zh-CN voices. */

let chosenVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const zh = voices.filter((v) => /^zh(-|_)?(CN|cn)?/i.test(v.lang) || /Chinese/i.test(v.name));
  return zh[0] ?? null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Voice list loads asynchronously on some browsers
  chosenVoice = pickVoice();
  window.speechSynthesis.onvoiceschanged = () => { chosenVoice = pickVoice(); };
}

export function isTtsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, opts: { rate?: number; lang?: string } = {}) {
  if (!isTtsAvailable()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? "zh-CN";
  u.rate = opts.rate ?? 0.9;
  if (chosenVoice) u.voice = chosenVoice;
  window.speechSynthesis.speak(u);
}

export function cancelSpeak() {
  if (!isTtsAvailable()) return;
  window.speechSynthesis.cancel();
}

/** Play a list of texts sequentially with a gap. */
export async function speakSequence(
  texts: string[],
  opts: { rate?: number; gapMs?: number; signal?: AbortSignal } = {},
) {
  if (!isTtsAvailable()) return;
  const gap = opts.gapMs ?? 1000;
  for (const text of texts) {
    if (opts.signal?.aborted) return;
    await new Promise<void>((res) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = opts.rate ?? 0.9;
      if (chosenVoice) u.voice = chosenVoice;
      u.onend = () => res();
      u.onerror = () => res();
      window.speechSynthesis.speak(u);
    });
    if (opts.signal?.aborted) return;
    await new Promise((r) => setTimeout(r, gap));
  }
}
