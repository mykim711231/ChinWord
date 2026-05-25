import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Play, Layers } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import {
  buildListenQueue,
  lessonsByVolume,
  type Volume,
} from "@/lib/content";
import {
  useFlashcards,
  type FlashcardScope,
} from "@/state/flashcards";
import { useSrs } from "@/state/srsStore";

type AreaKind = "vocab" | "idiom";

type ScopeOption = { value: string; label: string; scope: FlashcardScope };

function buildScopeOptions(area: AreaKind): ScopeOption[] {
  const out: ScopeOption[] = [
    { value: "all", label: "전체", scope: { kind: "all" } },
  ];
  for (const vol of [1, 2, 3] as Volume[]) {
    // Only include lessons of the requested kind for area
    const lessons = lessonsByVolume(vol).filter((l) => l.kind === area);
    if (lessons.length === 0) continue;
    out.push({
      value: `vol-${vol}`,
      label: `${vol}권 전체`,
      scope: { kind: "vol", vol },
    });
    for (const l of lessons) {
      out.push({
        value: `lesson-${l.groupId}`,
        label: `${vol}권.${String(l.no).padStart(2, "0")}과. ${l.titleKo}`,
        scope: { kind: "lesson", groupId: l.groupId },
      });
    }
  }
  return out;
}

function scopeKey(s: FlashcardScope): string {
  if (s.kind === "all") return "all";
  if (s.kind === "vol") return `vol-${s.vol}`;
  return `lesson-${s.groupId}`;
}

export default function Flashcards(): JSX.Element {
  const { area } = useParams<{ area?: string }>();
  if (area !== "vocab" && area !== "idiom") {
    return <Navigate to="/flashcards/vocab" replace />;
  }
  return <FlashcardSetup area={area} />;
}

function FlashcardSetup({ area }: { area: AreaKind }): JSX.Element {
  const navigate = useNavigate();
  const {
    vocabScope,
    idiomScope,
    dueOnly,
    direction,
    setVocabScope,
    setIdiomScope,
    setDueOnly,
    setDirection,
  } = useFlashcards();

  const scope = area === "vocab" ? vocabScope : idiomScope;
  const setScope = area === "vocab" ? setVocabScope : setIdiomScope;

  const scopeOptions = useMemo(() => buildScopeOptions(area), [area]);

  // Full queue in scope for this area
  const queue = useMemo(
    () =>
      buildListenQueue({
        scope,
        area: { vocab: area === "vocab", idiom: area === "idiom" },
      }),
    [scope, area],
  );

  // Intersect with SRS due cards if dueOnly
  const cardMap = useSrs((s) => s.cards);
  const dueQueue = useMemo(() => {
    if (!dueOnly) return queue;
    const now = Date.now();
    return queue.filter((e) => {
      const c = cardMap[e.id];
      return c && !c.masteredAt && c.dueAt <= now;
    });
  }, [queue, cardMap, dueOnly]);

  const total = queue.length;
  const dueCount = dueQueue.length;
  const playable = dueOnly ? dueCount > 0 : total > 0;

  const title = area === "vocab" ? "단어 플래시카드" : "성어 플래시카드";

  return (
    <PageShell>
      <TopBar title={title} back />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        범위와 방향을 정한 뒤 시작하세요. 답을 확인하고 난이도를 선택하면 다음 카드로 넘어갑니다.
      </p>

      {/* area 전환 (단어 ↔ 성어) */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Link
          to="/flashcards/vocab"
          className={
            "card text-center text-sm py-2 " +
            (area === "vocab"
              ? "border-primary text-primary font-semibold"
              : "border-divider text-muted")
          }
        >
          단어
        </Link>
        <Link
          to="/flashcards/idiom"
          className={
            "card text-center text-sm py-2 " +
            (area === "idiom"
              ? "border-primary text-primary font-semibold"
              : "border-divider text-muted")
          }
        >
          성어
        </Link>
      </div>

      {/* 범위 */}
      <section className="card">
        <label htmlFor="fc-scope" className="block text-xs text-muted mb-1">
          범위
        </label>
        <select
          id="fc-scope"
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

      {/* 방향 */}
      <section className="card mt-3">
        <span className="block text-xs text-muted mb-1">출제 방향</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection("hanzi-first")}
            aria-pressed={direction === "hanzi-first"}
            className={
              "card text-left p-3 " +
              (direction === "hanzi-first"
                ? "border-primary text-primary"
                : "border-divider")
            }
          >
            <div className="font-semibold text-sm">한자 → 뜻</div>
            <div className="text-xs text-muted mt-0.5">한자를 보고 뜻을 떠올려요</div>
          </button>
          <button
            type="button"
            onClick={() => setDirection("meaning-first")}
            aria-pressed={direction === "meaning-first"}
            className={
              "card text-left p-3 " +
              (direction === "meaning-first"
                ? "border-primary text-primary"
                : "border-divider")
            }
          >
            <div className="font-semibold text-sm">뜻 → 한자</div>
            <div className="text-xs text-muted mt-0.5">뜻을 보고 한자를 떠올려요</div>
          </button>
        </div>
      </section>

      {/* 옵션 */}
      <section className="card mt-3">
        <label className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm">복습 카드만</div>
            <div className="text-xs text-muted mt-0.5">
              SRS에 추가된 카드 중 오늘 복습할 항목만 표시합니다.
            </div>
          </div>
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => setDueOnly(e.target.checked)}
            className="w-5 h-5 accent-primary"
          />
        </label>
      </section>

      {/* 통계 + 시작 */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-sm">
          {dueOnly ? (
            <>
              <span className="inline-flex items-center gap-1 text-primary">
                <Layers size={14} aria-hidden />
                <span className="font-semibold">{dueCount}</span>
              </span>
              <span className="text-muted text-xs"> / {total}개 (오늘 복습)</span>
            </>
          ) : (
            <>
              <span className="font-semibold">{total}</span>
              <span className="text-muted text-xs">개 카드</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/flashcards/${area}/play`)}
          disabled={!playable}
          className="btn-primary inline-flex items-center gap-1 disabled:opacity-40"
        >
          <Play size={16} aria-hidden />
          <span>시작</span>
        </button>
      </div>

      {!playable ? (
        <div className="mt-3 text-center">
          <div className="text-xs text-muted">
            {dueOnly
              ? "이 범위에 오늘 복습할 카드가 없습니다."
              : "이 범위에 카드가 없습니다."}
          </div>
          {/* dueOnly 모드에서 빈 큐는 dead-end 가 되기 쉽다 — 명시적 CTA 로
              사용자가 한 번에 복귀할 수 있게 한다. (P1 S-02) */}
          {dueOnly && total > 0 ? (
            <button
              type="button"
              onClick={() => setDueOnly(false)}
              className="btn-ghost mt-2 text-xs inline-flex items-center gap-1 border border-divider"
            >
              ‘복습 카드만’ 옵션 끄기 ({total}개 표시)
            </button>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
