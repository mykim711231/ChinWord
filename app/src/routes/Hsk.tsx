import { Link } from "react-router-dom";
import { useMemo } from "react";
import { ChevronRight, Sprout, Building2, Mountain } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { hskLevelSummaries, type HskLevelSummary } from "@/lib/hsk-meta";

/**
 * HSK 3.0 어휘 랜딩 — 3-tier 구조.
 *
 *   기초 (HSK 1-4)  · 일상 회화 (3,181)
 *   중급 (HSK 5)    · 주제별 (1,059)
 *   고급 (HSK 6-9)  · 빈도/도메인 (6,729)
 *
 * 각 tier 내부에서는 다음 sub-grouping 으로 진입:
 *   - 기초: 레벨 chip (전체/1/2/3/4) + 주제 필터(준비 중)
 *   - 중급: 주제 카드 6개 (일상/직장/사회/감정/자연/추상) — 분류 데이터 준비 중,
 *           현재는 전체 보기로 fall back
 *   - 고급: 빈도 batch (Top 100, 101-200, …) + 도메인 필터(준비 중)
 *
 * 7개 레벨을 평면적으로 나열하던 이전 디자인 대신 SLA 연구에 따른 분급:
 * 1-4 는 기초로 묶고, 5 는 단일 레벨로 주제 학습, 6-9 는 통합 고급 풀로 빈도/도메인
 * 접근을 우선.
 */
export default function Hsk() {
  const levels = hskLevelSummaries();
  const tiers = useMemo(() => buildTiers(levels), [levels]);
  const totalAll = tiers.reduce((s, t) => s + t.total, 0);
  const translatedAll = tiers.reduce((s, t) => s + t.translated, 0);
  const pctAll = totalAll === 0 ? 0 : Math.round((translatedAll / totalAll) * 100);

  return (
    <PageShell>
      <TopBar
        title="HSK 급수별"
        subtitle={`HSK 3.0 · 전체 ${totalAll.toLocaleString()}개`}
      />

      <div className="mt-2 text-xs text-muted px-1">
        한국어 번역 진행도:{" "}
        <span className="text-fg font-medium">{pctAll}%</span> (
        {translatedAll.toLocaleString()}/{totalAll.toLocaleString()})
        {pctAll < 100 ? (
          <span className="block mt-0.5">
            미번역 항목은 영문(영) 표시로 노출됩니다.
          </span>
        ) : null}
      </div>

      <ul className="mt-3 space-y-3">
        {tiers.map((t) => {
          const pct = t.total === 0 ? 0 : Math.round((t.translated / t.total) * 100);
          const Icon = t.icon;
          return (
            <li key={t.id}>
              <Link
                to={`/hsk/${t.id}`}
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
                  {/* 진행 막대 — color 차이로 진행도 안내, screen reader 는 텍스트로. */}
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
                <ChevronRight size={18} aria-hidden className="text-muted flex-none" />
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}

export type HskTier = {
  id: "basic" | "mid" | "adv";
  title: string;
  subtitle: string;
  tagline: string;
  icon: typeof Sprout;
  levels: HskLevelSummary[];
  total: number;
  translated: number;
};

function buildTiers(levels: HskLevelSummary[]): HskTier[] {
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
      levels: [1, 2, 3, 4].map((n) => byLv.get(n as 1 | 2 | 3 | 4)!).filter(Boolean),
      ...basic,
    },
    {
      id: "mid",
      title: "중급",
      subtitle: "HSK 5급",
      tagline: "주제별 어휘 확장",
      icon: Building2,
      levels: [byLv.get(5)!].filter(Boolean),
      ...mid,
    },
    {
      id: "adv",
      title: "고급",
      subtitle: "HSK 6-9급",
      tagline: "빈도·도메인별 심화",
      icon: Mountain,
      levels: [byLv.get(6)!, byLv.get(7)!].filter(Boolean),
      ...adv,
    },
  ];
}
