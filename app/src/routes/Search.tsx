import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { search, type SearchHit } from "@/lib/search";

type Filter = "all" | "vocab" | "idiom" | "meaning";

const FILTER_LABEL: Record<Filter, string> = {
  all: "전체",
  vocab: "단어",
  idiom: "고사성어",
  meaning: "한국어 뜻",
};

export default function Search() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [debounced, setDebounced] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const results: SearchHit[] = useMemo(
    () => (debounced ? search(debounced, filter) : []),
    [debounced, filter],
  );

  return (
    <PageShell>
      <TopBar title="검색" back />

      <input
        autoFocus
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="한자 · 병음 · 한국어 뜻"
        className="w-full mt-2 rounded-btn border border-divider bg-surface px-3 py-3 text-base"
      />

      <div className="flex gap-2 mt-3 overflow-x-auto -mx-4 px-4">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-chip px-3 py-1 text-sm border whitespace-nowrap " +
              (filter === f
                ? "bg-primary text-white border-primary"
                : "bg-surface text-fg border-divider")
            }
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {debounced && results.length === 0 ? (
        <div className="text-center text-muted text-sm mt-8">
          "{debounced}"에 대한 결과가 없습니다.
        </div>
      ) : null}

      <ul className="mt-4 divide-y divide-divider/60 rounded-card border border-divider/60 bg-surface">
        {results.map((r) => (
          <li key={r.id}>
            <Link
              to={r.kind === "vocab" ? `/vocab/${r.id}` : `/idiom/${r.id}`}
              className="flex items-center gap-3 px-3 py-3"
            >
              <span
                className={
                  "rounded-chip px-2 py-0.5 text-[10px] " +
                  (r.kind === "vocab"
                    ? "bg-primary-soft text-primary"
                    : "bg-accent/20 text-accent")
                }
              >
                {r.kind === "vocab" ? "단어" : "성어"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="hanzi-text text-xl">{r.word}</span>
                  <span className="pinyin-text text-sm truncate">{r.pinyin}</span>
                </div>
                <div className="text-sm text-muted truncate">
                  {r.meaning} · <span className="text-xs">{r.groupTitle}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
