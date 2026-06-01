import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Minus, Plus, Repeat, Shuffle } from "lucide-react";
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
    intervalSec,
    repeats,
    loop,
    shuffle,
    deckFilter,
    setScope,
    setDisplay,
    setIntervalSec,
    setRepeats,
    setLoop,
    setShuffle,
    setDeckFilter,
  } = useListen();

  const scopeOptions = useMemo(() => buildScopeOptions(), []);
  const baseQueue = useMemo(
    () => buildListenQueue({ scope, area: { vocab: true, idiom: true } }),
    [scope],
  );
  const filtered = useDeckFilter(baseQueue, deckFilter);
  const count = filtered.length;
  const canStart = count > 0;

  return (
    <PageShell>
      <TopBar title="이어듣기" />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        선택한 범위의 카드를 순서대로 읽어줍니다.
        반복 횟수만큼 한 카드를 반복 재생한 뒤 다음 카드로 넘어갑니다.
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
          value={deckFilter}
          onChange={setDeckFilter}
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

      {/* 카드 (간격 + 반복) */}
      <section className="card mt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">카드 간격</span>
            <span className="text-sm tabular-nums">{intervalSec.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="w-full"
            aria-label="카드 간격"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">반복 횟수</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRepeats(repeats - 1)}
              disabled={repeats <= 1}
              className="w-9 h-9 rounded-lg border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 횟수 감소"
            >
              <Minus size={14} aria-hidden />
            </button>
            <span className="text-base font-semibold tabular-nums w-6 text-center">
              {repeats}
            </span>
            <button
              type="button"
              onClick={() => setRepeats(repeats + 1)}
              disabled={repeats >= 10}
              className="w-9 h-9 rounded-lg border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 횟수 증가"
            >
              <Plus size={14} aria-hidden />
            </button>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>
      </section>

      {/* 반복 재생 / 무작위 */}
      <section className="card mt-3">
        <span className="block text-xs text-muted mb-2">재생 방식</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLoop(!loop)}
            aria-pressed={loop}
            className={
              "inline-flex items-center gap-1 rounded-chip px-3 py-1 text-sm border " +
              (loop
                ? "bg-primary text-white border-primary"
                : "bg-surface text-fg border-divider")
            }
          >
            <Repeat size={14} aria-hidden />
            <span>반복 재생</span>
          </button>
          <button
            type="button"
            onClick={() => setShuffle(!shuffle)}
            aria-pressed={shuffle}
            className={
              "inline-flex items-center gap-1 rounded-chip px-3 py-1 text-sm border " +
              (shuffle
                ? "bg-primary text-white border-primary"
                : "bg-surface text-fg border-divider")
            }
          >
            <Shuffle size={14} aria-hidden />
            <span>무작위</span>
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1">
          반복 재생: 범위 끝에서 처음으로 다시 시작 · 무작위: 카드 순서를 섞어서 재생
        </p>
      </section>

      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-sm">
          재생 대상: <span className="font-semibold">{count}</span>개
          {repeats > 1 ? (
            <span className="text-muted text-xs"> (× {repeats} = {count * repeats}회)</span>
          ) : null}
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
