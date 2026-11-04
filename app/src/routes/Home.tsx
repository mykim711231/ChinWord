import { ShareQr } from "@/components/ShareQr";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  BookOpen,
  ScrollText,
  GraduationCap,
  Search,
  Sprout,
  Building2,
  Mountain,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { hskLevelSummaries, hskTotalAll } from "@/lib/hsk-meta";
import { idiomTotalCount } from "@/lib/vocab-meta";

type GridCard = {
  to: string;
  label: string;
  sub: string;
  icon: typeof Sprout;
};

export default function Home() {
  const idiomCount = useMemo(() => idiomTotalCount(), []);
  const hskTotal = useMemo(() => hskTotalAll(), []);
  const ls = useMemo(() => hskLevelSummaries(), []);
  const sum = (lvs: number[]) =>
    ls.filter((l) => lvs.includes(l.level)).reduce((s, l) => s + l.total, 0);

  const cards = useMemo<GridCard[]>(
    () => [
      {
        to: "/vocab/basic",
        label: "기초",
        sub: `HSK 1-4급 · ${sum([1, 2, 3, 4]).toLocaleString()}개`,
        icon: Sprout,
      },
      {
        to: "/vocab/mid",
        label: "중급",
        sub: `HSK 5급 · ${sum([5]).toLocaleString()}개`,
        icon: Building2,
      },
      {
        to: "/vocab/adv",
        label: "고급",
        sub: `HSK 6-9급 · ${sum([6, 7]).toLocaleString()}개`,
        icon: Mountain,
      },
      {
        to: "/vocab/idioms",
        label: "고사성어",
        sub: `${idiomCount}개`,
        icon: ScrollText,
      },
      {
        to: "/learn",
        label: "학습",
        sub: "이어듣기 · 필순 · 플래시카드",
        icon: GraduationCap,
      },
      {
        to: "/search",
        label: "검색",
        sub: "한자 · 병음 · 뜻",
        icon: Search,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idiomCount, ls],
  );

  return (
    <>
      {/* 히어로 — 브랜드 + 핵심 진입(이어듣기/단어장) */}
      <section className="rounded-card bg-primary text-white p-5 mt-1 mb-4 shadow-card">
        <div className="text-xs opacity-80">중국어 어휘 학습</div>
        <h1 className="text-2xl font-bold leading-tight mt-0.5">
          HSK 어휘 따라하기
        </h1>
        <p className="text-sm opacity-90 mt-1.5 leading-snug">
          한자 · 병음 · 뜻을 듣고 따라하며 전체{" "}
          {(hskTotal + idiomCount).toLocaleString()}개 어휘를 익혀요.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/listen"
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-primary font-medium px-4 py-2 text-sm active:opacity-80 transition"
          >
            <Headphones size={16} aria-hidden />
            이어듣기
            <ArrowRight size={14} aria-hidden />
          </Link>
          <Link
            to="/vocab"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/60 text-white px-4 py-2 text-sm active:bg-white/10 transition"
          >
            <BookOpen size={16} aria-hidden />
            단어장
          </Link>
          <ShareQr variant="hero" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.to}
              to={c.to}
              className="card flex flex-col items-center text-center hover:shadow-lg transition py-5"
            >
              <Icon size={22} aria-hidden className="text-primary mb-1.5" />
              <div className="font-semibold text-sm">{c.label}</div>
              <div className="text-[11px] text-muted mt-1 leading-tight">
                {c.sub}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
