/**
 * Web Speech API + 사전녹음 mp3 wrapper for Mandarin TTS.
 *
 * 두 가지 경로를 우선순위에 따라 시도한다:
 *
 *  1. 사전녹음 mp3 (zh-tts-manifest.json hit) — `<audio>` 재생
 *     - 빌드 시 msedge-tts 가 zh-CN-XiaoxiaoNeural(또는 지정 음성)으로 합성한 파일.
 *     - 기기 음성팩 유무, 브라우저, OS 와 무관하게 동일한 신경망 음질을 보장.
 *     - PWA 정적 자산(public/tts/*.mp3)이라 service worker 캐시에 들어가
 *       오프라인에서도 재생된다.
 *
 *  2. Web Speech API — manifest miss 또는 mp3 재생 실패 시
 *     - 사용자가 검색·UI 상의 비정형 텍스트(부분 문장 등)를 발화 시도하는 경우 대비.
 *     - Chrome/Edge 의 voiceschanged 비동기 로드, iOS 제스처, voice 캐시 등 기존 quirks
 *       처리 그대로 유지.
 *
 * Quirks handled (기존):
 *  - voices may load asynchronously (Chrome fires `voiceschanged` later) —
 *    awaitVoices() 로 첫 speak 에서 재시도.
 *  - cachedZhVoice 는 voiceschanged 시 무효화돼 새로 설치된 음성팩 즉시 반영.
 *  - cancel() 은 무엇이 큐에 있을 때만 호출 (iOS race 회피).
 *  - zh 음성이 없으면 `u.lang = "zh-CN"` 만 힌트로 두고 OS 라우팅에 위임.
 */
import ttsManifest from "@/data/zh-tts-manifest.json";

export const ZH_LANGS = ["zh-CN", "zh-Hans-CN", "zh", "cmn-Hans-CN"];

/** Recognises mainland-Mandarin-compatible voices (zh-CN / zh-SG / zh-Hans). */
export const ZH_CN_LIKE_RE = /^zh(-|_)?(cn|sg|hans)/i;

const TTS_MANIFEST = ttsManifest as Record<string, string>;
const TTS_BASE_URL = `${import.meta.env.BASE_URL}tts/`;

let cachedZhVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;

// Cancellation epoch — speak()/cancelSpeak() 시 매번 증가.
// 비동기 분기(awaitVoices, audio.onerror 재시도 등)에서 자신이 시작된 epoch 와
// 현재 epoch 를 비교, cancel/새 speak 이후라면 emit/fallback 을 건너뛴다.
let speakEpoch = 0;

// Chrome/Edge voice list warmup — 일부 Chromium 엔진은 `voiceschanged` 리스너가
// 한 번이라도 붙어 있어야 이벤트가 발화된다.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      // Invalidate cache so a newly installed voice is picked up immediately.
      cachedZhVoice = null;
    });
  } catch {
    /* ignore */
  }
}

export function isTtsAvailable(): boolean {
  // mp3 매니페스트가 비어있지 않으면 Web Speech 미지원 환경에서도 동작 가능.
  if (typeof window === "undefined") return false;
  if ("speechSynthesis" in window) return true;
  return Object.keys(TTS_MANIFEST).length > 0;
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return [];
  return window.speechSynthesis.getVoices();
}

export function pickMandarinVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;
  // Exact lang priority — zh-CN first, then close variants
  for (const lang of ZH_LANGS) {
    const v = voices.find((vc) => vc.lang === lang);
    if (v) return v;
  }
  // Loose match — any zh-CN-like variant (zh-Hans, zh-SG, zh_CN, etc.)
  const cnLike = voices.find((v) => ZH_CN_LIKE_RE.test(v.lang));
  if (cnLike) return cnLike;
  // Last resort: any zh/cmn voice (zh-TW, zh-HK, etc.) — wrong topolect for
  // this textbook but still recognisable Mandarin pronunciation.
  const anyZh = voices.find((v) => /^(zh|cmn)/i.test(v.lang));
  return anyZh ?? null;
}

/** Wait for voices to be available (Chrome async load). */
export function awaitVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return resolve([]);
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) return resolve(existing);
    let done = false;
    const onChange = (): void => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", onChange);
    setTimeout(() => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    }, timeoutMs);
  });
}

function ensureVoice(): SpeechSynthesisVoice | null {
  if (cachedZhVoice) return cachedZhVoice;
  cachedZhVoice = pickMandarinVoice();
  return cachedZhVoice;
}

export function hasChineseVoice(): boolean {
  return ensureVoice() !== null;
}

export function currentVoiceName(): string | null {
  // mp3 매니페스트가 채워져 있으면 "녹음 음성"으로 알린다 — 사용자 진단 UI 가
  // "현재 음성"을 표시할 때 기기 음성 대신 사전녹음을 쓴다는 사실을 명시.
  if (Object.keys(TTS_MANIFEST).length > 0) {
    return "사전녹음 음성 (Microsoft Edge Neural)";
  }
  return ensureVoice()?.name ?? null;
}

/** Returns all available voices for diagnostic UI. */
export function listVoices(): {
  name: string;
  lang: string;
  default: boolean;
}[] {
  return getVoices().map((v) => ({
    name: v.name,
    lang: v.lang,
    default: v.default,
  }));
}

/**
 * 매니페스트 키 정규화.
 *
 * 매니페스트는 build-tts 가 원문 그대로 키로 저장하지만 화면에 표시되는 텍스트는
 * lessons JSON/검색 입력/사용자 편집 경로를 거치면서 다음 비가시 문자가 섞일 수 있다.
 *  - NBSP(U+00A0) → 일반 공백
 *  - Zero-width(U+200B~200F, U+FEFF) → 제거
 *  - 전각 공백(U+3000) → 일반 공백
 *  - smart quotes / em-dash → ASCII 동치
 *  - 양끝 공백 trim
 *
 * 정규화하지 않으면 사람 눈에 똑같은 문자열이 miss 로 빠져 Web Speech 폴백(음질 저하)
 * 으로 떨어진다 — silent quality fail.
 */
function normalizeManifestKey(text: string): string {
  return text
    .replace(/[​-‏﻿]/g, "") // zero-width / BOM
    .replace(/[ 　]/g, " ")        // NBSP, ideographic space
    .replace(/[‘’]/g, "'")        // smart single quotes
    .replace(/[“”]/g, '"')        // smart double quotes
    .replace(/[–—]/g, "-")        // en/em dash
    .trim();
}

function lookupPrerecorded(text: string): string | null {
  if (!text) return null;
  const normalized = normalizeManifestKey(text);
  if (!normalized) return null;
  const direct = TTS_MANIFEST[normalized];
  if (direct) return `${TTS_BASE_URL}${direct}`;
  // 레거시 호환 — 매니페스트가 unicode 변종을 그대로 저장한 경우 대비.
  const raw = text.trim();
  if (raw !== normalized) {
    const legacy = TTS_MANIFEST[raw];
    if (legacy) return `${TTS_BASE_URL}${legacy}`;
  }
  return null;
}

function stopAudio(): void {
  if (!currentAudio) return;
  try {
    currentAudio.pause();
    currentAudio.src = "";
  } catch {
    /* ignore */
  }
  currentAudio = null;
}

/**
 * 사전녹음 mp3 재생. 실패 시 fallback() 호출 (보통 Web Speech).
 *
 * 첫 클릭 안정화: cold network/디코드 지연으로 1차 play() 가 실패할 때
 * 1회만 짧게 재시도 (audio.load() + play 재호출). 두 번째 클릭은 캐시/디코드가
 * 끝나 있어 항상 1차에 성공. 재시도까지 실패하면 fallback.
 */
function playPrerecorded(
  url: string,
  rate: number,
  epoch: number,
  onEnd: () => void,
  fallback: () => void,
): void {
  stopAudio();
  const a = new Audio();
  a.preload = "auto";
  a.src = url;
  a.playbackRate = rate;
  a.onended = (): void => {
    if (currentAudio === a) currentAudio = null;
    if (epoch !== speakEpoch) return;
    onEnd();
  };
  let retried = false;
  const giveUp = (): void => {
    if (currentAudio === a) currentAudio = null;
    if (epoch !== speakEpoch) return; // cancel/새 speak 이후 폴백 차단
    fallback();
  };
  const retry = (): void => {
    if (retried) {
      giveUp();
      return;
    }
    retried = true;
    setTimeout(() => {
      if (epoch !== speakEpoch) return;
      try {
        a.load();
        const p2 = a.play();
        if (p2 && typeof p2.catch === "function") p2.catch(giveUp);
      } catch {
        giveUp();
      }
    }, 80);
  };
  // 파일 누락(404)·디코드 실패는 audio.onerror — 1회 retry 후 폴백.
  a.onerror = retry;
  currentAudio = a;
  const p = a.play();
  if (p && typeof p.catch === "function") {
    p.catch(retry);
  }
}

/**
 * Configure an utterance for Mandarin speech. Sets `u.voice` if we have a
 * Chinese voice; otherwise leaves voice unset and only hints `u.lang = "zh-CN"`
 * so the OS engine can still route to a Chinese voice.
 */
function configureUtterance(
  u: SpeechSynthesisUtterance,
  voice: SpeechSynthesisVoice | null,
  opts: { rate?: number; lang?: string },
): void {
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = opts.lang || "zh-CN";
  }
  u.rate = opts.rate ?? 0.9;
}

/** Cancel only when something is queued — avoids iOS race. */
function safeCancelSynth(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) {
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function cancelSpeak(): void {
  // epoch 증가로 모든 in-flight 비동기 분기 무효화.
  speakEpoch++;
  stopAudio();
  safeCancelSynth();
}

/**
 * Web Speech 로 합성 — 매니페스트 miss / mp3 재생 실패 시의 폴백 경로.
 */
function speakSynth(
  text: string,
  opts: { rate?: number; lang?: string },
  epoch: number,
  onEnd?: () => void,
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  safeCancelSynth();
  const voice = ensureVoice();
  const u = new SpeechSynthesisUtterance(text);
  configureUtterance(u, voice, opts);
  if (onEnd) {
    u.onend = (): void => {
      if (epoch !== speakEpoch) return;
      onEnd();
    };
    u.onerror = (): void => {
      if (epoch !== speakEpoch) return;
      onEnd();
    };
  }
  // voices 가 아직 안 들어왔으면 한 번 더 기다린 뒤 재선택해 발화.
  if (!voice) {
    void awaitVoices().then(() => {
      if (epoch !== speakEpoch) {
        onEnd?.();
        return;
      }
      const retry = pickMandarinVoice();
      if (retry) {
        cachedZhVoice = retry;
        u.voice = retry;
        u.lang = retry.lang;
      }
      window.speechSynthesis.speak(u);
    });
    return;
  }
  window.speechSynthesis.speak(u);
}

export function speak(
  text: string,
  opts: { rate?: number; lang?: string } = {},
): void {
  if (!isTtsAvailable() || !text) return;
  const epoch = ++speakEpoch;
  stopAudio();
  safeCancelSynth();
  const url = lookupPrerecorded(text);
  if (url) {
    playPrerecorded(
      url,
      opts.rate ?? 0.9,
      epoch,
      () => {
        /* onEnd: nothing to do for fire-and-forget speak */
      },
      () => speakSynth(text, opts, epoch),
    );
    return;
  }
  speakSynth(text, opts, epoch);
}

/**
 * Speak one text and resolve when speech ends (or is cancelled/aborted).
 * Used by stroke-order sync and the listen loop.
 */
export function speakAsync(
  text: string,
  opts: { rate?: number; lang?: string; signal?: AbortSignal } = {},
): Promise<void> {
  if (!isTtsAvailable() || !text) return Promise.resolve();
  if (opts.signal?.aborted) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const epoch = ++speakEpoch;
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      opts.signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = (): void => {
      cancelSpeak();
      finish();
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const url = lookupPrerecorded(text);
    if (url) {
      playPrerecorded(
        url,
        opts.rate ?? 0.9,
        epoch,
        finish,
        () => speakSynth(text, opts, epoch, finish),
      );
      return;
    }
    speakSynth(text, opts, epoch, finish);
  });
}

/**
 * Abort-aware sleep — resolves either after `ms` ms or immediately when the
 * signal aborts. Without this, a `setTimeout` based gap would block the loop
 * for up to `gapMs` after abort (≤1s by default), making 정지/이전/다음 sluggish.
 */
function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(t);
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Play a list of texts sequentially with a gap. */
export async function speakSequence(
  texts: string[],
  opts: { rate?: number; gapMs?: number; signal?: AbortSignal } = {},
): Promise<void> {
  if (!isTtsAvailable()) return;
  // Pre-warm voice list so the first utterance doesn't race.
  if (!ensureVoice()) await awaitVoices();
  const gap = opts.gapMs ?? 1000;
  for (const text of texts) {
    if (opts.signal?.aborted) return;
    await speakAsync(text, { rate: opts.rate, signal: opts.signal });
    if (opts.signal?.aborted) return;
    await abortableSleep(gap, opts.signal);
    if (opts.signal?.aborted) return;
  }
}
