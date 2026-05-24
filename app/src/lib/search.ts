import MiniSearch, { type SearchResult } from "minisearch";
import indexJson from "@/data/search-index.json";

const MS = MiniSearch.loadJSON(JSON.stringify(indexJson), {
  fields: ["word", "pinyin", "meaning"],
  storeFields: ["id", "kind", "word", "pinyin", "meaning", "groupId", "groupTitle"],
});

export type SearchHit = {
  id: string;
  kind: "vocab" | "idiom";
  word: string;
  pinyin: string;
  meaning: string;
  groupId: string;
  groupTitle: string;
  score: number;
};

export function search(
  query: string,
  filter: "all" | "vocab" | "idiom" | "meaning" = "all",
  limit = 40,
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const opts = filter === "meaning" ? { fields: ["meaning"] } : {};
  const results = MS.search(q, { ...opts, prefix: true, fuzzy: 0.2 });
  const filtered = results
    .filter((r: SearchResult) =>
      filter === "vocab" ? r.kind === "vocab"
      : filter === "idiom" ? r.kind === "idiom"
      : true,
    )
    .slice(0, limit);
  return filtered.map((r: SearchResult) => ({
    id: r.id as string,
    kind: r.kind as "vocab" | "idiom",
    word: r.word as string,
    pinyin: r.pinyin as string,
    meaning: r.meaning as string,
    groupId: r.groupId as string,
    groupTitle: r.groupTitle as string,
    score: r.score,
  }));
}
