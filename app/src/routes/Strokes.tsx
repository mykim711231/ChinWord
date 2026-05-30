import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PenLine, Minus, Plus, Repeat, Shuffle } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue } from "@/lib/content";
import { buildScopeOptions, scopeKey } from "@/lib/scope-options";
import { useListen } from "@/state/listen";

const HANZI_RE = /\p{Script=Han}/u;

function hasHanzi(s: string): boolean {
  return Array.from(s).some((c) => HANZI_RE.test(c));
}

export default function Strokes(): JSX.Element {
  const navigate = useNavigate();
  const {
    scope,
    display,
    strokeRepeats,
    loop,
    shuffle,
    setScope,
    setDisplay,
    setStrokeRepeats,
    setLoop,
    setShuffle,
  } = useListen();

  const scopeOptions = useMemo(() => buildScopeOptions(), []);
  const queue = useMemo(
    () =>
      buildListenQueue({ scope, area: { vocab: true, idiom: true } }).filter(
        (e) => hasHanzi(e.word),
      ),
    [scope],
  );
  const count = queue.length;
  const canStart = count > 0;

  return (
    <PageShell>
      <TopBar title="필순" />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        선택한 범위의 한자를 순서대로 그립니다. 카드당 반복 횟수만큼 그린
        뒤 다음으로 넘어갑니다.
      </p>

      {/* 범위 */}
      <section className="card">
        <label htmlFor="strokes-scope" className="block text-xs text-muted mb-1">
          범위
        </label>
        <select
          id="strokes-scope"
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

      {/* 표시 */}
      <section className="card mt-3">
        <span className="block text-xs text-muted mb-1">표시</span>
        <div className="flex flex-wrap gap-2">
          {(["pinyin", "korean"] as const).map((k) => {
            const label = k === "pinyin" ? "병음" : "한국어";
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
          병음·한국어는 보조 자막으로 표시됩니다.
        </p>
      </section>

      {/* 카드 (반복 횟수) */}
      <section className="card mt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">반복 횟수</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStrokeRepeats(strokeRepeats - 1)}
              disabled={strokeRepeats <= 1}
              className="w-9 h-9 rounded-lg border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 횟수 감소"
            >
              <Minus size={14} aria-hidden />
            </button>
            <span className="text-base font-semibold tabular-nums w-6 text-center">
              {strokeRepeats}
            </span>
            <button
              type="button"
              onClick={() => setStrokeRepeats(strokeRepeats + 1)}
              disabled={strokeRepeats >= 10}
              className="w-9 h-9 rounded-lg border border-divider inline-flex items-center justify-center disabled:opacity-40"
              aria-label="반복 횟수 증가"
            >
              <Plus size={14} aria-hidden />
            </button>
            <span className="text-xs text-muted">회</span>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2">
          각 카드를 {strokeRepeats}회 그린 뒤 다음 카드로 진행합니다.
        </p>
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
          학습 대상: <span className="font-semibold">{count}</span>개
          {strokeRepeats > 1 ? (
            <span className="text-muted text-xs"> (× {strokeRepeats}회 그리기)</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => navigate("/strokes/play")}
          disabled={!canStart}
          className="btn-primary inline-flex items-center gap-1 disabled:opacity-40"
        >
          <PenLine size={16} aria-hidden />
          <span>시작</span>
        </button>
      </div>
    </PageShell>
  );
}
