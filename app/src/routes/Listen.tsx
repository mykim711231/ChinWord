import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { DeckFilterChips } from "@/components/DeckFilterChips";
import { buildListenQueue } from "@/lib/content";
import { useDeckFilter } from "@/lib/deck-filter";
import { buildScopeOptions, scopeKey } from "@/lib/scope-options";
import { useListen } from "@/state/listen";

export default function Listen() {
  const navigate = useNavigate();
  const {
    scope,
    display,
    deckFilter,
    setScope,
    setDisplay,
    setDeckFilter,
  } = useListen();

  const scopeOptions = useMemo(() => buildScopeOptions(), []);
  const baseQueue = useMemo(
    () => buildListenQueue({ scope, area: { vocab: true, idiom: true } }),
    [scope],
  );
  // 이어듣기는 "모름" 미노출 → 혹시 영속된 unknown 은 전체로 취급.
  const effectiveFilter = deckFilter === "unknown" ? "all" : deckFilter;
  const filtered = useDeckFilter(baseQueue, effectiveFilter);
  const count = filtered.length;
  const canStart = count > 0;

  return (
    <PageShell>
      <TopBar title="이어듣기" />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        선택한 범위의 카드를 순서대로 읽어줍니다.
        카드 간격·반복·재생 방식은 재생 화면에서 조절할 수 있습니다.
      </p>

      {/* 범위 */}
      <section className="card">
        <label htmlFor="listen-scope" className="block text-xs text-muted mb-1">
          범위
        </label>
        <select
          id="listen-scope"
          value={scopeKey(scope)}
          onChange={(e) => {
            const opt = scopeOptions.find((o) => o.value === e.target.value);
            if (opt) setScope(opt.scope);
          }}
          className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-sm"
        >
          {scopeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      {/* 학습 대상 필터 (전체 / 즐겨찾기 / 모름) */}
      <div className="mt-3">
        <DeckFilterChips
          base={baseQueue}
          value={effectiveFilter}
          onChange={setDeckFilter}
          showUnknown={false}
        />
      </div>

      {/* 표시 */}
      <section className="card mt-3">
        <span className="block text-xs text-muted mb-1">표시</span>
        <div className="flex flex-wrap gap-2">
          {(["hanzi", "pinyin", "korean"] as const).map((k) => {
            const label = k === "hanzi" ? "한자" : k === "pinyin" ? "병음" : "한국어";
            const on = display[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDisplay({ [k]: !on })}
                aria-pressed={on}
                className={
                  "rounded-chip px-3 py-1 text-sm border " +
                  (on
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-fg border-divider")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted mt-1">
          표시 토글은 음성 재생에 영향을 주지 않습니다 (항상 zh로 재생).
        </p>
      </section>

      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-sm">
          재생 대상: <span className="font-semibold">{count}</span>개
        </div>
        <button
          type="button"
          onClick={() => navigate("/listen/play")}
          disabled={!canStart}
          className="btn-primary inline-flex items-center gap-1 disabled:opacity-40"
        >
          <Play size={16} aria-hidden />
          <span>시작</span>
        </button>
      </div>
    </PageShell>
  );
}
