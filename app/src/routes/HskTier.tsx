import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Construction, Sparkles, Tag } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import {
  displayMeaning,
  hskWordsByLevel,
  type HskLevel,
} from "@/lib/hsk";
import type { HskEntry } from "@/types";

const PAGE_SIZE = 50;
const BATCH_SIZE = 100;

/**
 * HSK Tier 라우트 — /hsk/:tier
 *
 *   basic (HSK 1-4): 레벨 chip nav + 주제 필터 placeholder + 페이지네이션
 *   mid   (HSK 5)  : 주제 카드 6개 placeholder + 전체보기 모드
 *   adv   (HSK 6-9): 레벨 chip + 빈도 batch 그룹 헤더 + 도메인 필터 placeholder
 *
 * URL query:
 *   ?level=N   레벨 필터 (basic: 1-4, adv: 6/7, default=all)
 *   ?page=N    1-based page index
 *   ?view=all  mid tier 의 전체 보기 모드 진입
 */
export default function HskTier() {
  const { tier } = useParams<{ tier?: string }>();

  if (tier === "basic") return <BasicTier />;
  if (tier === "mid") return <MidTier />;
  if (tier === "adv") return <AdvTier />;

  return (
    <PageShell>
      <TopBar title="HSK" />
      <div className="text-center text-muted mt-12">잘못된 경로입니다.</div>
      <div className="text-center mt-2">
        <Link to="/hsk" className="text-primary text-sm">
          ← 급수 선택으로
        </Link>
      </div>
    </PageShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// 기초 (HSK 1-4)
// ────────────────────────────────────────────────────────────────────
function BasicTier() {
  const [sp, setSp] = useSearchParams();
  const rawLevel = sp.get("level");
  const level: "all" | HskLevel =
    rawLevel === "1" || rawLevel === "2" || rawLevel === "3" || rawLevel === "4"
      ? (Number(rawLevel) as HskLevel)
      : "all";
  const [filter, setFilter] = useState("");

  const pool = useMemo(() => {
    const lvs: HskLevel[] =
      level === "all" ? [1, 2, 3, 4] : [level as HskLevel];
    return lvs.flatMap((lv) => hskWordsByLevel(lv));
  }, [level]);

  return (
    <TierFrame
      title="기초 (HSK 1-4)"
      subtitle="일상 회화의 뼈대"
      pool={pool}
      filter={filter}
      onFilter={setFilter}
    >
      <ChipNav
        items={[
          { value: "all", label: "전체" },
          { value: "1", label: "1급" },
          { value: "2", label: "2급" },
          { value: "3", label: "3급" },
          { value: "4", label: "4급" },
        ]}
        value={String(level)}
        onChange={(v) => {
          const next = new URLSearchParams(sp);
          if (v === "all") next.delete("level");
          else next.set("level", v);
          next.delete("page");
          setSp(next, { replace: true });
        }}
      />

      <PlaceholderBanner
        icon={Tag}
        text="주제 필터 (음식·가족·시간·…) 준비 중"
        hint="LLM 분류 단계 추가 시 활성화됩니다"
      />
    </TierFrame>
  );
}

// ────────────────────────────────────────────────────────────────────
// 중급 (HSK 5)
// ────────────────────────────────────────────────────────────────────
const MID_THEMES = [
  { id: "daily",   title: "일상·구어" },
  { id: "work",    title: "직장·경제" },
  { id: "society", title: "사회·문화" },
  { id: "emotion", title: "감정·심리" },
  { id: "nature",  title: "자연·과학" },
  { id: "abstract",title: "추상·논리" },
] as const;

function MidTier() {
  const [sp, setSp] = useSearchParams();
  const viewAll = sp.get("view") === "all";
  const [filter, setFilter] = useState("");

  const pool = useMemo(() => hskWordsByLevel(5), []);

  if (!viewAll) {
    // 랜딩 — 주제 카드 placeholder + 전체보기 진입
    return (
      <PageShell>
        <TopBar
          title="중급 (HSK 5)"
          subtitle={`${pool.length.toLocaleString()}개 단어 · 주제별 어휘 확장`}
        />

        <PlaceholderBanner
          icon={Construction}
          text="주제별 분류 준비 중"
          hint="LLM 분류 후 6개 주제로 그룹화될 예정 (예: 일상·구어 200~300단어)"
        />

        <ul className="mt-3 grid grid-cols-2 gap-2">
          {MID_THEMES.map((t) => (
            <li key={t.id}>
              <div
                className="card flex flex-col items-center text-center py-4 opacity-60 cursor-not-allowed"
                aria-disabled="true"
                title="분류 데이터 준비 중"
              >
                <div className="font-medium text-sm">{t.title}</div>
                <div className="text-[10px] text-muted mt-1">준비 중</div>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(sp);
            next.set("view", "all");
            setSp(next, { replace: true });
          }}
          className="mt-4 card w-full flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <Sparkles size={16} aria-hidden className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">전체 보기</div>
              <div className="text-[11px] text-muted mt-0.5">
                HSK 5급 {pool.length.toLocaleString()}개 평면 리스트
              </div>
            </div>
          </div>
          <span className="text-sm text-primary">시작 →</span>
        </button>
      </PageShell>
    );
  }

  // 전체보기 모드 — 리스트
  return (
    <TierFrame
      title="중급 (HSK 5) · 전체"
      subtitle={`${pool.length.toLocaleString()}개 단어`}
      pool={pool}
      filter={filter}
      onFilter={setFilter}
      backLink={{ to: "/hsk/mid", label: "← 주제 선택으로" }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────
// 고급 (HSK 6-9)
// ────────────────────────────────────────────────────────────────────
function AdvTier() {
  const [sp, setSp] = useSearchParams();
  const rawLevel = sp.get("level");
  const level: "all" | HskLevel =
    rawLevel === "6" || rawLevel === "7"
      ? (Number(rawLevel) as HskLevel)
      : "all";
  const rawGroup = sp.get("group");
  // 기본: 빈도순 그룹 헤더. ?group=flat 으로 끄기 가능.
  const groupByFreq = rawGroup !== "flat";
  const [filter, setFilter] = useState("");

  const pool = useMemo(() => {
    const lvs: HskLevel[] = level === "all" ? [6, 7] : [level as HskLevel];
    const arr = lvs.flatMap((lv) => hskWordsByLevel(lv));
    if (groupByFreq) {
      // freqRank 가 없는 항목은 뒤로 정렬 (Infinity).
      return [...arr].sort(
        (a, b) => (a.freqRank ?? Number.POSITIVE_INFINITY) - (b.freqRank ?? Number.POSITIVE_INFINITY),
      );
    }
    return arr;
  }, [level, groupByFreq]);

  return (
    <TierFrame
      title="고급 (HSK 6-9)"
      subtitle="빈도·도메인별 심화"
      pool={pool}
      filter={filter}
      onFilter={setFilter}
      sectionEvery={groupByFreq ? BATCH_SIZE : 0}
      sectionLabel={(start, end) =>
        `빈도 Batch · Top ${start.toLocaleString()}–${end.toLocaleString()}`
      }
    >
      <ChipNav
        items={[
          { value: "all", label: "전체" },
          { value: "6", label: "6급" },
          { value: "7", label: "7-9급" },
        ]}
        value={String(level)}
        onChange={(v) => {
          const next = new URLSearchParams(sp);
          if (v === "all") next.delete("level");
          else next.set("level", v);
          next.delete("page");
          setSp(next, { replace: true });
        }}
      />

      <div className="flex items-center justify-between gap-2 mt-2 px-1">
        <span className="text-[11px] text-muted">정렬</span>
        <div className="inline-flex rounded-btn border border-divider overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(sp);
              next.delete("group");
              next.delete("page");
              setSp(next, { replace: true });
            }}
            aria-pressed={groupByFreq}
            className={"px-2.5 py-1 " + (groupByFreq ? "bg-primary text-white" : "bg-surface")}
          >
            빈도순 (100개씩)
          </button>
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(sp);
              next.set("group", "flat");
              next.delete("page");
              setSp(next, { replace: true });
            }}
            aria-pressed={!groupByFreq}
            className={"px-2.5 py-1 " + (!groupByFreq ? "bg-primary text-white" : "bg-surface")}
          >
            급수순
          </button>
        </div>
      </div>

      <PlaceholderBanner
        icon={Tag}
        text="도메인 필터 (정치·법률·문학·과학기술·4자성어·서면어) 준비 중"
        hint="LLM 분류 단계 추가 시 활성화됩니다"
      />
    </TierFrame>
  );
}

// ────────────────────────────────────────────────────────────────────
// 공통 — Tier 리스트 프레임 (검색 + 페이지네이션 + 선택적 섹션 헤더)
// ────────────────────────────────────────────────────────────────────
function TierFrame({
  title,
  subtitle,
  pool,
  filter,
  onFilter,
  children,
  backLink,
  sectionEvery = 0,
  sectionLabel,
}: {
  title: string;
  subtitle?: string;
  pool: HskEntry[];
  filter: string;
  onFilter: (v: string) => void;
  children?: React.ReactNode;
  backLink?: { to: string; label: string };
  sectionEvery?: number;
  sectionLabel?: (start: number, end: number) => string;
}) {
  const [sp, setSp] = useSearchParams();
  const rawPage = sp.get("page");
  const page = Math.max(0, (Number(rawPage) || 1) - 1);

  // 필터 변경 시 page=0 으로 리셋 — 사용자가 다른 결과에서 잘못된 페이지를 보지 않도록.
  useEffect(() => {
    if (page > 0 && filter) {
      const next = new URLSearchParams(sp);
      next.delete("page");
      setSp(next, { replace: true });
    }
    // 의도적으로 filter 만 트리거. page 변동은 user navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (e) =>
        e.word.includes(filter) ||
        e.pinyin.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q) ||
        e.meaningEn.toLowerCase().includes(q),
    );
  }, [pool, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  function gotoPage(p: number): void {
    const next = new URLSearchParams(sp);
    if (p === 0) next.delete("page");
    else next.set("page", String(p + 1));
    setSp(next, { replace: true });
  }

  return (
    <PageShell>
      <TopBar title={title} subtitle={subtitle} />

      {backLink ? (
        <div className="mt-1">
          <Link to={backLink.to} className="text-xs text-primary">
            {backLink.label}
          </Link>
        </div>
      ) : null}

      {children}

      <div className="mt-3">
        <input
          type="search"
          inputMode="search"
          placeholder="검색 (한자·병음·뜻)"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted py-10 text-sm">검색 결과 없음</div>
      ) : (
        <>
          <RowList
            entries={visible}
            startOrdinal={pageStart + 1}
            sectionEvery={sectionEvery}
            sectionLabel={sectionLabel}
          />
          <PageNav
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            pageStart={pageStart}
            pageSize={PAGE_SIZE}
            onPage={gotoPage}
          />
        </>
      )}
    </PageShell>
  );
}

function RowList({
  entries,
  startOrdinal,
  sectionEvery,
  sectionLabel,
}: {
  entries: HskEntry[];
  startOrdinal: number;
  sectionEvery: number;
  sectionLabel?: (start: number, end: number) => string;
}) {
  // sectionEvery > 0 이면 startOrdinal 기준 N 마다 섹션 헤더 삽입.
  // (검색/필터 결과 안에서도 일관 — ordinal 은 페이지 시작 기준)
  const items: React.ReactNode[] = [];
  let nextHeader = sectionEvery > 0 ? Math.floor((startOrdinal - 1) / sectionEvery) * sectionEvery + 1 : -1;

  for (let i = 0; i < entries.length; i++) {
    const ord = startOrdinal + i;
    if (sectionEvery > 0 && ord >= nextHeader && ord < nextHeader + sectionEvery && (i === 0 || ord === nextHeader)) {
      // 페이지 첫 항목이거나 batch boundary 일 때 헤더 출력
      if (ord === nextHeader || i === 0) {
        const start = nextHeader;
        const end = nextHeader + sectionEvery - 1;
        items.push(
          <li key={`hdr-${start}`} className="py-2 mt-2 first:mt-0">
            <div className="text-xs font-semibold text-primary uppercase tracking-wide">
              {sectionLabel?.(start, end) ?? `${start}–${end}`}
            </div>
          </li>,
        );
        if (ord === nextHeader) nextHeader += sectionEvery;
      }
    }
    items.push(
      <HskRow key={entries[i].id} entry={entries[i]} ordinal={ord} />,
    );
  }

  return <ol className="mt-3 list-none divide-y divide-divider">{items}</ol>;
}

function HskRow({ entry, ordinal }: { entry: HskEntry; ordinal: number }) {
  const m = displayMeaning(entry);
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className="text-muted tabular-nums text-xs pt-1 w-10 flex-none text-right">
          {ordinal}
        </span>
        <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            <span className="hanzi-text text-xl leading-tight">{entry.word}</span>
            <span className="pinyin-text text-xs">{entry.pinyin}</span>
            {entry.pos.length > 0 ? (
              <span className="text-[11px] text-muted">[{entry.pos.join(",")}]</span>
            ) : null}
            <span className="text-[10px] text-muted">
              HSK {entry.hskLevel === 7 ? "7-9" : entry.hskLevel}급
            </span>
          </div>
          <div className="mt-0.5 text-sm break-words">
            {m.text}
            {m.fromFallback ? (
              <span
                className="ml-1.5 inline-block align-middle text-[10px] px-1.5 py-0.5 rounded-chip border border-divider text-muted"
                title="아직 한국어 번역 전 — 영문 의미로 표시"
              >
                영
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function ChipNav({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto whitespace-nowrap py-2 border-b border-divider sticky top-14 bg-bg/95 backdrop-blur z-20">
      <div className="flex gap-2">
        {items.map((it) => (
          <button
            type="button"
            key={it.value}
            onClick={() => onChange(it.value)}
            aria-pressed={value === it.value}
            className={
              "rounded-chip px-3 py-1 text-sm border " +
              (value === it.value
                ? "bg-primary text-white border-primary"
                : "bg-surface text-fg border-divider")
            }
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlaceholderBanner({
  icon: Icon,
  text,
  hint,
}: {
  icon: typeof Construction;
  text: string;
  hint?: string;
}) {
  return (
    <div
      role="note"
      className="mt-3 rounded-card border border-divider bg-primary-soft/30 px-3 py-2 flex items-start gap-2"
    >
      <Icon size={14} aria-hidden className="text-primary mt-0.5 flex-none" />
      <div className="min-w-0 text-xs">
        <div className="text-fg">{text}</div>
        {hint ? <div className="text-muted mt-0.5">{hint}</div> : null}
      </div>
    </div>
  );
}

function PageNav({
  page,
  pageCount,
  total,
  pageStart,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageStart: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) {
    return (
      <div className="mt-4 text-center text-xs text-muted">전체 {total}개</div>
    );
  }
  const from = pageStart + 1;
  const to = Math.min(pageStart + pageSize, total);
  return (
    <div className="mt-4 flex items-center justify-between gap-2 text-sm">
      <button
        type="button"
        onClick={() => onPage(Math.max(0, page - 1))}
        disabled={page === 0}
        className="btn-ghost border border-divider px-3 py-1 disabled:opacity-40"
        aria-label="이전 페이지"
      >
        ← 이전
      </button>
      <div className="text-xs text-muted tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} / {total.toLocaleString()}
        <span className="mx-1.5">·</span>
        {page + 1}/{pageCount}
      </div>
      <button
        type="button"
        onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className="btn-ghost border border-divider px-3 py-1 disabled:opacity-40"
        aria-label="다음 페이지"
      >
        다음 →
      </button>
    </div>
  );
}
