import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  BookOpen,
  ScrollText,
  GraduationCap,
  Search,
  ChevronRight,
  Sprout,
  Building2,
  Mountain,
} from "lucide-react";
import { hskLevelSummaries, hskTotalAll } from "@/lib/hsk-meta";
import { hskThemeIdioms } from "@/lib/hsk-themes";

type HskTierCard = {
  id: "basic" | "mid" | "adv";
  short: string;
  range: string;
  total: number;
  icon: typeof Sprout;
};

export default function Home() {
  const hskTotal = useMemo(() => hskTotalAll(), []);
  const idiomCount = useMemo(
    () => hskThemeIdioms().reduce((s, g) => s + g.entries.length, 0),
    [],
  );
  const hskTiers = useMemo<HskTierCard[]>(() => {
    const ls = hskLevelSummaries();
    const sum = (lvs: number[]) =>
      ls.filter((l) => lvs.includes(l.level)).reduce((s, l) => s + l.total, 0);
    return [
      { id: "basic", short: "기초", range: "1-4급", total: sum([1, 2, 3, 4]), icon: Sprout },
      { id: "mid",   short: "중급", range: "5급",   total: sum([5]),          icon: Building2 },
      { id: "adv",   short: "고급", range: "6-9급", total: sum([6, 7]),       icon: Mountain },
    ];
  }, []);

  return (
    <>
      <div className="mt-1 mb-4 text-xs text-muted">중국어 어휘 학습</div>

      {/* HSK 급수별 */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="font-semibold inline-flex items-center gap-1.5">
            <BookOpen size={16} aria-hidden className="text-primary" />
            <span>HSK 급수별</span>
          </h2>
          <Link
            to="/vocab"
            className="text-sm text-primary inline-flex items-center gap-0.5"
          >
            <span>모두 보기</span>
            <ChevronRight size={14} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {hskTiers.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                to={`/vocab/${t.id}`}
                className="card flex flex-col items-center text-center hover:shadow-lg transition py-4"
              >
                <Icon size={20} aria-hidden className="text-primary mb-1" />
                <div className="font-semibold text-sm">{t.short}</div>
                <div className="text-[11px] text-muted mt-0.5">HSK {t.range}</div>
                <div className="text-[10px] text-muted mt-1 tabular-nums">
                  {t.total.toLocaleString()}개
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-1 text-[11px] text-muted text-right px-1 tabular-nums">
          전체 {(hskTotal + idiomCount).toLocaleString()}개 (HSK 3.0)
        </div>
      </section>

      {/* 고사성어 */}
      <section className="mt-5">
        <Link
          to="/vocab/idioms"
          className="card flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <ScrollText size={18} aria-hidden className="text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm">고사성어</span>
              <div className="text-[11px] text-muted mt-0.5">{idiomCount}개</div>
            </div>
          </div>
          <ChevronRight size={16} aria-hidden className="text-muted" />
        </Link>
      </section>

      {/* 학습 */}
      <section className="mt-5">
        <Link
          to="/learn"
          className="card flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <GraduationCap size={18} aria-hidden className="text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm">학습</span>
              <div className="text-[11px] text-muted mt-0.5">
                이어듣기 · 필순 · 플래시카드
              </div>
            </div>
          </div>
          <ChevronRight size={16} aria-hidden className="text-muted" />
        </Link>
      </section>

      {/* 검색 */}
      <section className="mt-5">
        <Link
          to="/search"
          className="card flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <Search size={18} aria-hidden className="text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm">검색</span>
              <div className="text-[11px] text-muted mt-0.5">
                한자 · 병음 · 뜻으로 검색
              </div>
            </div>
          </div>
          <ChevronRight size={16} aria-hidden className="text-muted" />
        </Link>
      </section>
    </>
  );
}
