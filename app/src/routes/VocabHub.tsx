import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
  ChevronRight,
  Sprout,
  Building2,
  Mountain,
  Headphones,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { hskLevelSummaries, type HskLevelSummary } from "@/lib/hsk-meta";
import { buildListenQueue } from "@/lib/content";
import { useListen } from "@/state/listen";

/**
 * 단어장 랜딩 — /vocab
 *
 * HSK 3-tier (기초/중급/고급) 단어 그룹.
 * 성어는 별도 탭(/vocab/idioms)으로 분리.
 */
export default function VocabHub() {
  const levels = hskLevelSummaries();
  const tiers = useMemo(() => buildTiers(levels), [levels]);
  const totalAll = tiers.reduce((s, t) => s + t.total, 0);
  const translatedAll = tiers.reduce((s, t) => s + t.translated, 0);
  const pctAll =
    totalAll === 0 ? 0 : Math.round((translatedAll / totalAll) * 100);

  const navigate = useNavigate();

  const totalListen = useMemo(
    () =>
      buildListenQueue({
        scope: { kind: "all" },
        area: { vocab: true, idiom: false },
      }).length,
    [],
  );

  function startAllListen() {
    const s = useListen.getState();
    s.setScope({ kind: "all" });
    s.setArea({ vocab: true, idiom: false });
    navigate("/listen/play");
  }

  return (
    <PageShell>
      <TopBar
        title="단어장"
        subtitle={`HSK 3.0 · ${totalAll.toLocaleString()}개`}
      />

      {pctAll < 100 ? (
        <div className="mt-2 text-xs text-muted px-1">
          한국어 번역 진행도:{" "}
          <span className="text-fg font-medium">{pctAll}%</span> (
          {translatedAll.toLocaleString()}/{totalAll.toLocaleString()})
          <span className="block mt-0.5">
            미번역 항목은 영문(영) 표시로 노출됩니다.
          </span>
        </div>
      ) : null}

      {/* 전체 이어듣기 CTA */}
      <button
        type="button"
        onClick={startAllListen}
        disabled={totalListen === 0}
        className="mt-3 card w-full flex items-center justify-between hover:shadow-lg transition disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Headphones size={18} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">전체 이어듣기</div>
            <div className="text-xs text-muted mt-0.5">
              단어 {totalListen.toLocaleString()}개를 순서대로 재생
            </div>
          </div>
        </div>
        <span className="text-sm text-primary">시작 →</span>
      </button>

      {/* HSK Tier 카드 */}
      <ul className="mt-4 space-y-3">
        {tiers.map((t) => {
          const pct =
            t.total === 0
              ? 0
              : Math.round((t.translated / t.total) * 100);
          const Icon = t.icon;
          return (
            <li key={t.id}>
              <Link
                to={`/vocab/${t.id}`}
                className="card flex items-center gap-3 hover:shadow-lg transition"
                aria-label={`${t.title} ${t.total}개 단어 보기`}
              >
                <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center flex-none">
                  <Icon size={20} aria-hidden className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline flex-wrap gap-x-2">
                    <span className="font-semibold text-base">{t.title}</span>
                    <span className="text-xs text-muted">{t.subtitle}</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">{t.tagline}</div>
                  <div
                    className="mt-2 h-1.5 rounded-full bg-divider overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`번역 진행도 ${pct}%`}
                  >
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-muted tabular-nums">
                    {t.total.toLocaleString()}개 · 번역 {pct}%
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  aria-hidden
                  className="text-muted flex-none"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}

type TierCard = {
  id: "basic" | "mid" | "adv";
  title: string;
  subtitle: string;
  tagline: string;
  icon: typeof Sprout;
  total: number;
  translated: number;
};

function buildTiers(levels: HskLevelSummary[]): TierCard[] {
  const byLv = new Map(levels.map((l) => [l.level, l]));
  function sum(lvs: number[]): { total: number; translated: number } {
    let total = 0;
    let translated = 0;
    for (const lv of lvs) {
      const l = byLv.get(lv as 1 | 2 | 3 | 4 | 5 | 6 | 7);
      if (!l) continue;
      total += l.total;
      translated += l.translated;
    }
    return { total, translated };
  }
  const basic = sum([1, 2, 3, 4]);
  const mid = sum([5]);
  const adv = sum([6, 7]);
  return [
    {
      id: "basic",
      title: "기초",
      subtitle: "HSK 1-4급",
      tagline: "일상 회화의 뼈대",
      icon: Sprout,
      ...basic,
    },
    {
      id: "mid",
      title: "중급",
      subtitle: "HSK 5급",
      tagline: "주제별 어휘 확장",
      icon: Building2,
      ...mid,
    },
    {
      id: "adv",
      title: "고급",
      subtitle: "HSK 6-9급",
      tagline: "빈도·도메인별 심화",
      icon: Mountain,
      ...adv,
    },
  ];
}
