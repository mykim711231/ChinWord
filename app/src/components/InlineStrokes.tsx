import { useEffect, useState } from "react";
import {
  getStrokeDataFromCache,
  saveStrokeDataToCache,
  isOnline,
} from "@/lib/stroke-cache";

/**
 * 단어를 구성하는 각 한자를 1획 → 2획 → … → 완성 형태로 본문 글자 크기에 가깝게
 * 인라인 표시한다. 한글 글자가 "ㅍ → 피 → 필" 로 누적 형성되는 모습을 보여 주듯,
 * 한자도 각 단계 SVG 를 나열해 빠르게 필순을 훑을 수 있게 한다.
 *
 * - 데이터: hanzi-writer-data (makemeahanzi 호환, 1024x1024 좌표계, Y-up).
 * - 3계층 캐시: 모듈 in-memory Map → IndexedDB(stroke-cache) → CDN.
 *   IndexedDB 덕분에 SW 유무·dev/prod 무관하게 본 글자는 오프라인 표시 가능.
 *
 * 색상: 완성 획은 primary, 미완 획은 divider (다크 모드 자동 대응 Tailwind 토큰).
 */

type CharData = {
  strokes: string[];
  medians: number[][][];
};

const cache = new Map<string, CharData | Promise<CharData>>();
const HANZI_RE = /\p{Script=Han}/u;

function loadChar(ch: string): Promise<CharData> {
  const hit = cache.get(ch);
  if (hit && !(hit instanceof Promise)) return Promise.resolve(hit);
  if (hit instanceof Promise) return hit;

  const p = (async (): Promise<CharData> => {
    // 1) IndexedDB 캐시 우선 — 오프라인에서도 본 글자는 즉시.
    const cached = (await getStrokeDataFromCache(ch)) as CharData | null;
    if (cached) {
      cache.set(ch, cached);
      return cached;
    }
    // 2) 캐시 미스 + 오프라인 → 실패 (폴백으로 완성 글자만 표시).
    if (!isOnline()) {
      cache.delete(ch);
      throw new Error("offline, no cached stroke data");
    }
    // 3) 온라인 → CDN 다운로드 후 IndexedDB 저장.
    const r = await fetch(
      `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/` +
        `${encodeURIComponent(ch)}.json`,
    );
    if (!r.ok) {
      cache.delete(ch);
      throw new Error(`HTTP ${r.status}`);
    }
    const data = (await r.json()) as CharData;
    cache.set(ch, data);
    void saveStrokeDataToCache(ch, data);
    return data;
  })();

  cache.set(ch, p);
  return p;
}

export function InlineStrokes({
  word,
  pinyinPerChar,
  size = 22,
}: {
  word: string;
  /**
   * 한자 한 자당 병음 음절. 길이는 word 안 한자 개수와 같아야 한다 (splitPinyin
   * 결과). 누락/불일치 시 라벨만 생략하고 필순 표시는 계속 동작한다.
   */
  pinyinPerChar?: string[];
  /** 한 획 단계 SVG 의 변길이 px. 본문 1em 근처가 자연스럽다. */
  size?: number;
}) {
  const chars = Array.from(word).filter((c) => HANZI_RE.test(c));
  if (chars.length === 0) return null;
  const pys =
    pinyinPerChar && pinyinPerChar.length === chars.length
      ? pinyinPerChar
      : undefined;
  return (
    <div
      className="flex flex-wrap items-start gap-x-3 gap-y-2"
      aria-label={`${word} 필순`}
    >
      {chars.map((ch, i) => (
        <CharProgress
          key={`${i}-${ch}`}
          char={ch}
          pinyin={pys?.[i]}
          size={size}
        />
      ))}
    </div>
  );
}

function CharProgress({
  char,
  pinyin,
  size,
}: {
  char: string;
  pinyin?: string;
  size: number;
}) {
  const [data, setData] = useState<CharData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadChar(char)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [char]);

  if (failed) {
    // 폴백: 데이터를 못 받으면 그냥 완성 글자를 한 칸 보여 줘 흐름 유지.
    return (
      <span className="inline-flex flex-col items-center">
        <span className="hanzi-text" style={{ fontSize: size }}>
          {char}
        </span>
        {pinyin ? (
          <span className="pinyin-text text-xs">{pinyin}</span>
        ) : null}
      </span>
    );
  }
  if (!data) {
    return (
      <span className="inline-flex flex-col items-center gap-1">
        <span
          className="inline-block rounded bg-divider/40 animate-pulse"
          style={{ width: size, height: size }}
          aria-hidden
        />
        {pinyin ? (
          <span className="pinyin-text text-xs">{pinyin}</span>
        ) : null}
      </span>
    );
  }
  const n = data.strokes.length;
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: n }, (_, i) => (
          <StrokeSvg
            key={i}
            strokes={data.strokes}
            upTo={i + 1}
            size={size}
          />
        ))}
      </span>
      {pinyin ? (
        <span className="pinyin-text text-xs leading-none">{pinyin}</span>
      ) : null}
    </span>
  );
}

function StrokeSvg({
  strokes,
  upTo,
  size,
}: {
  strokes: string[];
  upTo: number;
  size: number;
}) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden
    >
      {/* makemeahanzi 좌표계 보정 — Y-up → SVG Y-down. */}
      <g transform="scale(1, -1) translate(0, -900)">
        {strokes.map((d, i) => (
          <path
            key={i}
            d={d}
            className={i < upTo ? "fill-primary" : "fill-divider"}
          />
        ))}
      </g>
    </svg>
  );
}
