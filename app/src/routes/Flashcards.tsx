import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Play, Layers } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { buildListenQueue } from "@/lib/content";
import {
  hskThemesByTier,
  hskThemeIdioms,
} from "@/lib/hsk-themes";
import {
  useFlashcards,
  type FlashcardScope,
} from "@/state/flashcards";

type AreaKind = "vocab" | "idiom";

type ScopeOption = { value: string; label: string; scope: FlashcardScope };

/** 단어 영역: 기초/중급/고급 티어 + 개별 그룹 */
function buildVocabScopeOptions(): ScopeOption[] {
  const out: ScopeOption[] = [
    { value: "all", label: "전체 (기초+중급+고급)", scope: { kind: "all" } },
  ];

  const basic = hskThemesByTier("basic");
  out.push({
    value: "tier-basic",
    label: `── 기초 (HSK 1-4) 전체 · ${basic.reduce((s, g) => s + g.entries.length, 0)}개`,
    scope: { kind: "tier", tier: "basic" },
  });
  for (const g of basic)
    out.push({
      value: `theme-${g.id}`,
      label: `    ${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });

  const mid = hskThemesByTier("mid");
  out.push({
    value: "tier-mid",
    label: `── 중급 (HSK 5) 전체 · ${mid.reduce((s, g) => s + g.entries.length, 0)}개`,
    scope: { kind: "tier", tier: "mid" },
  });
  for (const g of mid)
    out.push({
      value: `theme-${g.id}`,
      label: `    ${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });

  const adv = hskThemesByTier("adv");
  out.push({
    value: "tier-adv",
    label: `── 고급 (HSK 6-9) 전체 · ${adv.reduce((s, g) => s + g.entries.length, 0)}개`,
    scope: { kind: "tier", tier: "adv" },
  });
  for (const g of adv)
    out.push({
      value: `theme-${g.id}`,
      label: `    ${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });

  return out;
}

/** 성어 영역: 성어 티어 전체 + 개별 그룹 */
function buildIdiomScopeOptions(): ScopeOption[] {
  const idioms = hskThemeIdioms();
  const out: ScopeOption[] = [
    {
      value: "all",
      label: `전체 · ${idioms.reduce((s, g) => s + g.entries.length, 0)}개`,
      scope: { kind: "tier", tier: "idiom" },
    },
  ];
  for (const g of idioms)
    out.push({
      value: `theme-${g.id}`,
      label: `${g.title} · ${g.entries.length}개`,
      scope: { kind: "theme", groupId: g.id },
    });
  return out;
}

function scopeKey(s: FlashcardScope): string {
  if (s.kind === "all") return "all";
  if (s.kind === "tier") return `tier-${s.tier}`;
  if (s.kind === "theme") return `theme-${s.groupId}`;
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
    direction,
    setVocabScope,
    setIdiomScope,
    setDirection,
  } = useFlashcards();

  const scope = area === "vocab" ? vocabScope : idiomScope;
  const setScope = area === "vocab" ? setVocabScope : setIdiomScope;

  const scopeOptions = useMemo(
    () => (area === "vocab" ? buildVocabScopeOptions() : buildIdiomScopeOptions()),
    [area],
  );

  const queue = useMemo(
    () =>
      buildListenQueue({
        scope,
        area: { vocab: area === "vocab", idiom: area === "idiom" },
      }),
    [scope, area],
  );

  const total = queue.length;
  const playable = total > 0;
  const title = area === "vocab" ? "단어 플래시카드" : "성어 플래시카드";

  return (
    <PageShell>
      <TopBar title={title} back />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        범위와 방향을 정한 뒤 시작하세요. 답을 확인하고 맞음/틀림을 선택하면 다음 카드로 넘어갑니다.
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

      {/* 통계 + 시작 */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div className="text-sm">
          <span className="font-semibold">{total}</span>
          <span className="text-muted text-xs">개 카드</span>
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
            이 범위에 카드가 없습니다.
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
