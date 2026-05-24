import { useSettings } from "@/state/settings";

export function WordCard({
  word,
  pinyin,
  pos,
  meaning,
}: {
  word: string;
  pinyin: string;
  pos?: string;
  meaning?: string;
}) {
  const mode = useSettings((s) => s.displayMode);
  return (
    <div className="card text-center">
      <div className="hanzi-text text-3xl sm:text-4xl">{word}</div>
      {mode !== "hanzi-only" ? (
        <div className="pinyin-text mt-2">{pinyin}</div>
      ) : null}
      {mode === "all" ? (
        <>
          {pos ? <div className="text-xs text-muted mt-1">[{pos}]</div> : null}
          {meaning ? <div className="mt-2 text-base">{meaning}</div> : null}
        </>
      ) : null}
    </div>
  );
}
