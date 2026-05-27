import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Headphones, PenLine, Layers, ChevronRight, BarChart3 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { useSrs } from "@/state/srsStore";
import { hskLevelSummaries } from "@/lib/hsk-meta";
import { hskThemeIdioms } from "@/lib/hsk-themes";

export default function Learn(): JSX.Element {
  const total = useSrs((s) => Object.keys(s.cards).length);
  const due = useSrs((s) => s.dueCards().length);

  const tiers = useMemo(() => {
    const ls = hskLevelSummaries();
    const sum = (lvs: number[]) =>
      ls.filter((l) => lvs.includes(l.level)).reduce((s, l) => s + l.total, 0);
    const translated = (lvs: number[]) =>
      ls.filter((l) => lvs.includes(l.level)).reduce((s, l) => s + l.translated, 0);
    return [
      { label: "기초", total: sum([1, 2, 3, 4]), translated: translated([1, 2, 3, 4]) },
      { label: "중급", total: sum([5]), translated: translated([5]) },
      { label: "고급", total: sum([6, 7]), translated: translated([6, 7]) },
    ];
  }, []);

  const idiomCount = useMemo(
    () => hskThemeIdioms().reduce((s, g) => s + g.entries.length, 0),
    [],
  );

  return (
    <PageShell>
      <TopBar title="학습" />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        영역·범위·표시를 정한 뒤 마라톤 모드로 학습합니다.
      </p>

      <Link
        to="/listen"
        className="card flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Headphones size={22} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">이어듣기</div>
            <div className="text-xs text-muted mt-0.5">
              카드를 순서대로 들려줍니다 · 카드 간격 + 반복
            </div>
          </div>
        </div>
        <ChevronRight size={20} aria-hidden className="text-muted" />
      </Link>

      <Link
        to="/strokes"
        className="card mt-3 flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <PenLine size={22} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">필순</div>
            <div className="text-xs text-muted mt-0.5">
              한 글자를 N회 그린 뒤 다음 카드로 진행
            </div>
          </div>
        </div>
        <ChevronRight size={20} aria-hidden className="text-muted" />
      </Link>

      {/* 단일 플래시카드 진입점 — 기본 단어, 설정 화면에서 단어/성어 전환 가능. */}
      <Link
        to="/flashcards"
        className="card mt-3 flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Layers size={22} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">플래시카드</div>
            <div className="text-xs text-muted mt-0.5">
              단어·성어를 카드로 복습 · 권/과 단위 선택
            </div>
          </div>
        </div>
        <ChevronRight size={20} aria-hidden className="text-muted" />
      </Link>

      {total > 0 ? (
        <div className="text-xs text-muted text-center mt-3">
          전체 복습 카드 {total}개 · 오늘 {due}개 학습 예정
        </div>
      ) : null}

      {/* 학습 통계 — tier별 진행도 */}
      <section className="mt-6">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <BarChart3 size={14} aria-hidden className="text-primary" />
          <span className="font-semibold text-sm">학습 통계</span>
        </div>
        <div className="card space-y-3">
          {tiers.map((t) => {
            const pct =
              t.total === 0
                ? 0
                : Math.round((t.translated / t.total) * 100);
            return (
              <div key={t.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{t.label}</span>
                  <span className="text-muted tabular-nums">
                    {t.translated.toLocaleString()}/{t.total.toLocaleString()} · {pct}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full bg-divider overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${t.label} 진행도 ${pct}%`}
                >
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {/* 성어 */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">성어</span>
              <span className="text-muted tabular-nums">
                {idiomCount}/{idiomCount} · 100%
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-divider overflow-hidden"
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="성어 진행도 100%"
            >
              <div className="h-full bg-primary" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
