import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";

/** A single Chinese character with animated stroke order via hanzi-writer. */
export function HanziWriterCard({
  char,
  size = 180,
}: {
  char: string;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    try {
      writerRef.current = HanziWriter.create(containerRef.current, char, {
        width: size,
        height: size,
        padding: 8,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 120,
        showOutline: true,
        showCharacter: false,
        strokeColor: "#DC2626",
        outlineColor: "#E5E7EB",
        radicalColor: "#F59E0B",
        // hanzi-writer-data is loaded on demand from jsDelivr by default
        charDataLoader: (charToLoad, onComplete, onError) => {
          const url =
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/` +
            `${encodeURIComponent(charToLoad)}.json`;
          fetch(url)
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
            .then(onComplete)
            .catch((e) => {
              setError("필순 데이터를 불러오지 못했습니다");
              onError?.(e);
            });
        },
      });
      writerRef.current.animateCharacter();
    } catch (e) {
      setError(String((e as Error).message || e));
    }
    return () => {
      writerRef.current = null;
    };
  }, [char, size]);

  const replay = () => writerRef.current?.animateCharacter();
  const loop = () => writerRef.current?.loopCharacterAnimation();

  return (
    <div className="card flex flex-col items-center gap-2">
      <div className="text-sm text-muted">{char}</div>
      <div
        ref={containerRef}
        className="bg-white dark:bg-slate-100 rounded-md"
        style={{ width: size, height: size }}
        aria-label={`${char} 필순 애니메이션`}
        role="img"
      />
      {error ? (
        <div className="text-xs text-muted">{error}</div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={replay} className="btn-ghost text-sm">▶ 재생</button>
          <button type="button" onClick={loop} className="btn-ghost text-sm">⟳ 반복</button>
        </div>
      )}
    </div>
  );
}
