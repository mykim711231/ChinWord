import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { hskThemesByTier } from "@/lib/hsk-themes";
import { DoneBadge } from "@/components/DoneBadge";
import type { VocabEntry } from "@/types";

const PAGE_SIZE = 50;

/**
 * HSK Tier 라우트 — /vocab/basic, /vocab/mid, /vocab/adv
 *
 * 전체보기는 hsk-themes 데이터(VocabEntry)를 사용하여
 * 한국어 의미가 포함된 평면 리스트를 표시.
 */
export default function HskTier() {
  const { tier } = useParams<{ tier?: string }>();
  const loc = useLocation();

  const resolved =
    tier ??
    (loc.pathname.includes("/basic")
      ? "basic"
      : loc.pathname.includes("/mid")
      ? "mid"
      : loc.pathname.includes("/adv")
      ? "adv"
      : undefined);

  if (resolved === "basic") return <BasicTier />;
  if (resolved === "mid") return <MidTier />;
  if (resolved === "adv") return <AdvTier />;

  return (
    <PageShell>
      <TopBar title="HSK" />
      <div className="text-center text-muted mt-12">잘못된 경로입니다.</div>
      <div className="text-center mt-2">
        <Link to="/vocab" className="text-primary text-sm">
          ← 단어장으로
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
  const viewAll = sp.get("view") === "all";
  const rawLevel = sp.get("level");
  const level =
    rawLevel === "1" || rawLevel === "2" || rawLevel === "3" || rawLevel === "4"
      ? rawLevel
      : "all";
  const [filter, setFilter] = useState("");

  const themes = useMemo(() => hskThemesByTier("basic"), []);
  const allEntries = useMemo(
    () => themes.flatMap((g) => g.entries),
    [themes],
  );

  const pool = useMemo(() => {
    if (level === "all") return allEntries;
    return allEntries.filter((e) => e.hskLevel === Number(level));
  }, [allEntries, level]);

  if (!viewAll) {
    return (
      <PageShell>
        <TopBar
          title="기초 (HSK 1-4)"
          subtitle={`일상 회화의 뼈대 · ${allEntries.length.toLocaleString()}개 (테마별)`}
        />

        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(sp);
            next.set("view", "all");
            setSp(next, { replace: true });
          }}
          className="mt-3 card w-full flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <Sparkles size={16} aria-hidden className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">전체 보기</div>
              <div className="text-[11px] text-muted mt-0.5">
                HSK 1-4급 {allEntries.length.toLocaleString()}개 평면 리스트
              </div>
            </div>
          </div>
          <span className="text-sm text-primary">시작 →</span>
        </button>

        <ul className="mt-3 grid grid-cols-2 gap-2">
          {themes.map((t) => (
            <li key={t.id}>
              <Link
                to={`/vocab/theme/${t.id}`}
                className="card relative flex flex-col items-center text-center py-4 hover:shadow-lg transition"
              >
                <div className="font-medium text-sm">{t.title}</div>
                <DoneBadge id={t.id} />
                <div className="text-[10px] text-muted mt-0.5">
                  {t.entries.length}개
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </PageShell>
    );
  }

  return (
    <TierFrame
      title="기초 (HSK 1-4) · 전체"
      subtitle="일상 회화의 뼈대"
      pool={pool}
      filter={filter}
      onFilter={setFilter}
      backLink={{ to: "/vocab/basic", label: "← 테마 선택으로" }}
    >
      <ChipNav
        items={[
          { value: "all", label: "전체" },
          { value: "1", label: "1급" },
          { value: "2", label: "2급" },
          { value: "3", label: "3급" },
          { value: "4", label: "4급" },
        ]}
        value={level}
        onChange={(v) => {
          const next = new URLSearchParams(sp);
          if (v === "all") next.delete("level");
          else next.set("level", v);
          next.delete("page");
          next.set("view", "all");
          setSp(next, { replace: true });
        }}
      />
    </TierFrame>
  );
}

// ────────────────────────────────────────────────────────────────────
// 중급 (HSK 5)
// ────────────────────────────────────────────────────────────────────
function MidTier() {
  const [sp, setSp] = useSearchParams();
  const viewAll = sp.get("view") === "all";
  const [filter, setFilter] = useState("");

  const themes = useMemo(() => hskThemesByTier("mid"), []);
  const allEntries = useMemo(
    () => themes.flatMap((g) => g.entries),
    [themes],
  );

  if (!viewAll) {
    return (
      <PageShell>
        <TopBar
          title="중급 (HSK 5)"
          subtitle={`주제별 어휘 확장 · ${allEntries.length.toLocaleString()}개 (테마별)`}
        />

        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(sp);
            next.set("view", "all");
            setSp(next, { replace: true });
          }}
          className="mt-3 card w-full flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <Sparkles size={16} aria-hidden className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">전체 보기</div>
              <div className="text-[11px] text-muted mt-0.5">
                HSK 5급 {allEntries.length.toLocaleString()}개 평면 리스트
              </div>
            </div>
          </div>
          <span className="text-sm text-primary">시작 →</span>
        </button>

        <ul className="mt-3 grid grid-cols-2 gap-2">
          {themes.map((t) => (
            <li key={t.id}>
              <Link
                to={`/vocab/theme/${t.id}`}
                className="card relative flex flex-col items-center text-center py-4 hover:shadow-lg transition"
              >
                <div className="font-medium text-sm">{t.title}</div>
                <DoneBadge id={t.id} />
                <div className="text-[10px] text-muted mt-0.5">
                  {t.entries.length}개
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </PageShell>
    );
  }

  return (
    <TierFrame
      title="중급 (HSK 5) · 전체"
      subtitle={`${allEntries.length.toLocaleString()}개 단어`}
      pool={allEntries}
      filter={filter}
      onFilter={setFilter}
      backLink={{ to: "/vocab/mid", label: "← 주제 선택으로" }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────
// 고급 (HSK 6-9)
// ────────────────────────────────────────────────────────────────────
function AdvTier() {
  const [sp, setSp] = useSearchParams();
  const viewAll = sp.get("view") === "all";
  const rawLevel = sp.get("level");
  const level =
    rawLevel === "6" || rawLevel === "7" ? rawLevel : "all";
  const [filter, setFilter] = useState("");

  const themes = useMemo(() => hskThemesByTier("adv"), []);
  const allEntries = useMemo(
    () => themes.flatMap((g) => g.entries),
    [themes],
  );

  const pool = useMemo(() => {
    if (!viewAll) return [];
    if (level === "all") return allEntries;
    return allEntries.filter((e) => e.hskLevel === Number(level));
  }, [viewAll, allEntries, level]);

  if (viewAll) {
    return (
      <TierFrame
        title="고급 (HSK 6-9) · 전체"
        subtitle="빈도·도메인별 심화"
        pool={pool}
        filter={filter}
        onFilter={setFilter}
        backLink={{ to: "/vocab/adv", label: "← 배치 선택으로" }}
      >
        <ChipNav
          items={[
            { value: "all", label: "전체" },
            { value: "6", label: "6급" },
            { value: "7", label: "7-9급" },
          ]}
          value={level}
          onChange={(v) => {
            const next = new URLSearchParams(sp);
            if (v === "all") next.delete("level");
            else next.set("level", v);
            next.delete("page");
            next.set("view", "all");
            setSp(next, { replace: true });
          }}
        />
      </TierFrame>
    );
  }

  return (
    <PageShell>
      <TopBar
        title="고급 (HSK 6-9)"
        subtitle={`빈도별 배치 · ${allEntries.length.toLocaleString()}개`}
      />

      <button
        type="button"
        onClick={() => {
          const next = new URLSearchParams(sp);
          next.set("view", "all");
          setSp(next, { replace: true });
        }}
        className="mt-3 card w-full flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Sparkles size={16} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm">전체 보기</div>
            <div className="text-[11px] text-muted mt-0.5">
              HSK 6-9급 {allEntries.length.toLocaleString()}개 평면 리스트
            </div>
          </div>
        </div>
        <span className="text-sm text-primary">시작 →</span>
      </button>

      <ul className="mt-3 grid grid-cols-2 gap-2">
        {themes.map((g) => (
          <li key={g.id}>
            <Link
              to={`/vocab/theme/${g.id}`}
              className="card relative flex flex-col items-center text-center py-4 hover:shadow-lg transition"
            >
              <div className="font-medium text-sm">{g.title}</div>
                <DoneBadge id={g.id} />
              <div className="text-[10px] text-muted mt-0.5">
                {g.entries.length}개
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

// ────────────────────────────────────────────────────────────────────
// 공통 — Tier 리스트 프레임 (검색 + 페이지네이션)
// ────────────────────────────────────────────────────────────────────
function TierFrame({
  title,
  subtitle,
  pool,
  filter,
  onFilter,
  children,
  backLink,
}: {
  title: string;
  subtitle?: string;
  pool: VocabEntry[];
  filter: string;
  onFilter: (v: string) => void;
  children?: React.ReactNode;
  backLink?: { to: string; label: string };
}) {
  const [sp, setSp] = useSearchParams();
  const rawPage = sp.get("page");
  const page = Math.max(0, (Number(rawPage) || 1) - 1);

  useEffect(() => {
    if (page > 0 && filter) {
      const next = new URLSearchParams(sp);
      next.delete("page");
      setSp(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (e) =>
        e.word.includes(filter) ||
        e.pinyin.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q),
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
          <ol className="mt-3 list-none divide-y divide-divider">
            {visible.map((e, i) => (
              <VocabFlatRow
                key={e.id}
                entry={e}
                ordinal={pageStart + i + 1}
              />
            ))}
          </ol>
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

// ────────────────────────────────────────────────────────────────────
// 평면 행 — 간체(병음) [품사] + 뜻 + 즐겨찾기
// ────────────────────────────────────────────────────────────────────
function VocabFlatRow({
  entry,
  ordinal,
}: {
  entry: VocabEntry;
  ordinal: number;
}) {
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className="text-muted tabular-nums text-xs pt-1 w-10 flex-none text-right">
          {ordinal}
        </span>
        <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            <span lang="zh-Hans" className="hanzi-text text-xl leading-tight">{entry.word}</span>
            <span lang="zh-Latn-pinyin" className="pinyin-text text-xs">({entry.pinyin})</span>
            {entry.pos ? (
              <span className="text-[11px] text-muted">[{entry.pos}]</span>
            ) : null}
          </div>
          <div className="mt-0.5 text-sm">{entry.meaning}</div>
        </div>
        <FavStar id={entry.id} />
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
    <div
      role="group"
      aria-label="급수 필터"
      className="-mx-4 px-4 overflow-x-auto whitespace-nowrap py-2 border-b border-divider sticky top-14 bg-bg/95 backdrop-blur z-20"
    >
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
