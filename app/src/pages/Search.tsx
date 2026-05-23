import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import MiniSearch from "minisearch";
import { getAllVocabEntries, getAllIdiomEntries } from "@/data/lookup";
import type { VocabEntry, IdiomEntry } from "@/types";

type SearchResult = {
  id: string;
  word: string;
  pinyin: string;
  meaning: string;
  type: "vocab" | "idiom";
  entry: VocabEntry | IdiomEntry;
};

let miniSearch: MiniSearch | null = null;

function getIndex(): MiniSearch {
  if (miniSearch) return miniSearch;

  miniSearch = new MiniSearch({
    fields: ["word", "pinyin", "meaning"],
    storeFields: ["word", "pinyin", "meaning"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { word: 2 },
    },
  });

  const vocab = getAllVocabEntries();
  const idiom = getAllIdiomEntries();

  const docs = [
    ...vocab.map((v) => ({ id: v.id, word: v.word, pinyin: v.pinyin, meaning: v.meaning, type: "vocab" })),
    ...idiom.map((i) => ({ id: i.id, word: i.word, pinyin: i.pinyin, meaning: i.meaning, type: "idiom" })),
  ];

  miniSearch.addAll(docs);
  return miniSearch;
}

export function Search() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.trim().length === 0) return [];
    const idx = getIndex();
    const raw = idx.search(query.trim());
    return raw.slice(0, 30).map((r) => ({
      id: r.id,
      word: r.word as string,
      pinyin: r.pinyin as string,
      meaning: r.meaning as string,
      type: r.type as "vocab" | "idiom",
    }));
  }, [query]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          검색
        </h1>
      </header>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="한자, 병음, 한국어 뜻으로 검색..."
        autoFocus
        className="w-full px-4 py-3 rounded-xl text-base border outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
          borderColor: "var(--color-divider)",
        }}
      />

      {query.trim() && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {results.length}건 검색 결과
        </p>
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <Link
            key={r.id}
            to={r.type === "vocab" ? `/vocab/${r.id}` : `/idiom/${r.id}`}
            className="block rounded-xl p-4 no-underline"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                    {r.word}
                  </p>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: r.type === "vocab" ? "var(--color-primary-soft)" : "var(--color-accent)",
                      color: r.type === "vocab" ? "var(--color-primary)" : "#fff",
                    }}
                  >
                    {r.type === "vocab" ? "단어" : "성어"}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--color-pinyin)" }}>
                  {r.pinyin}
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {r.meaning}
                </p>
              </div>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>›</span>
            </div>
          </Link>
        ))}

        {query.trim() && results.length === 0 && (
          <div className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
