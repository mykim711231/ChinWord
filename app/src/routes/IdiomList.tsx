import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useLayoutEffect, useMemo, useState } from "react";
import { Headphones, PenLine, ChevronRight, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { InlineStrokes } from "@/components/InlineStrokes";
import { buildListenQueue } from "@/lib/content";
import {
  hskThemeIdioms,
  findHskThemeIdiomGroup,
} from "@/lib/hsk-themes";
import { splitPinyin, extractZhPrefix } from "@/lib/pinyin";
import { useListen } from "@/state/listen";

const HANZI_RE = /\p{Script=Han}/u;

export default function IdiomList() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();
  const loc = useLocation();

  const group = useMemo(
    () => (groupId ? findHskThemeIdiomGroup(groupId) : undefined),
    [groupId],
  );

  // hsk-theme-idioms 그룹 목록 (hub + chip nav)
  const htGroups = useMemo(() => hskThemeIdioms(), []);

  const [filter, setFilter] = useState("");

  const totalIdioms = htGroups.reduce((s, g) => s + g.entries.length, 0);

  const totalListen = useMemo(
    () =>
      buildListenQueue({
        scope: { kind: "tier", tier: "idiom" },
        area: { vocab: false, idiom: true },
      }).length,
    [],
  );

  // Scroll to hashed entry on mount / hash change
  useLayoutEffect(() => {
    if (!loc.hash) return;
    const id = decodeURIComponent(loc.hash.slice(1));
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [loc.hash, groupId]);

  function startLessonListen(id: string) {
    const s = useListen.getState();
    s.setScope({ kind: "theme", groupId: id });
    navigate("/listen/play");
  }

  // 전체 보기 모드 — 모든 그룹의 성어를 하나의 리스트로 표시
  const allEntries = useMemo(
    () => htGroups.flatMap((g) => g.entries),
    [htGroups],
  );

  if (groupId === "all") {
    const q = filter.trim().toLowerCase();
    const entries = !q
      ? allEntries
      : allEntries.filter(
          (e) =>
            e.word.includes(q) ||
            e.pinyin.toLowerCase().includes(q) ||
            e.meaning.toLowerCase().includes(q),
        );
    return (
      <PageShell>
        <TopBar title="고사성어 · 전체" subtitle={`${allEntries.length}개`} back />

        <div className="mt-3">
          <input
            type="search"
            placeholder="검색 (한자·병음·뜻)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-sm"
          />
        </div>

        <ol className="mt-3 list-none divide-y divide-divider">
          {entries.map((e, i) => (
            <li key={e.id} id={e.id} className="scroll-mt-32">
              <IdiomEntrySection entry={e} ordinal={i + 1} />
            </li>
          ))}
          {entries.length === 0 ? (
            <li className="text-center text-muted py-6 text-sm">검색 결과 없음</li>
          ) : null}
        </ol>
      </PageShell>
    );
  }

  if (groupId && group) {
    const q = filter.trim().toLowerCase();
    const entries = !q
      ? group.entries
      : group.entries.filter(
          (e) =>
            e.word.includes(q) ||
            e.pinyin.toLowerCase().includes(q) ||
            e.meaning.toLowerCase().includes(q),
        );
    return (
      <PageShell>
        <TopBar title={group.title} subtitle={group.titleZh} back />

        <div className="-mx-4 px-4 overflow-x-auto whitespace-nowrap py-2 border-b border-divider sticky top-14 bg-bg/95 backdrop-blur z-20">
          <div className="flex gap-2">
            {htGroups.map((g) => (
              <Link
                key={g.id}
                to={`/vocab/idioms/${g.id}`}
                className={
                  "rounded-chip px-3 py-1 text-sm border " +
                  (g.id === groupId
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-fg border-divider")
                }
              >
                {g.title}
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => startLessonListen(group.id)}
          className="mt-4 card w-full flex items-center justify-between hover:shadow-lg transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-soft inline-flex items-center justify-center">
              <Headphones size={16} aria-hidden className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">이 과 이어듣기</div>
              <div className="text-[11px] text-muted mt-0.5">
                {group.entries.length}개를 순서대로 재생
              </div>
            </div>
          </div>
          <span className="text-sm text-primary">시작 →</span>
        </button>

        <div className="mt-3">
          <input
            type="search"
            placeholder="과 내 검색 (한자·병음·뜻)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-sm"
          />
        </div>

        <ol className="mt-3 list-none divide-y divide-divider">
          {entries.map((e, i) => (
            <li
              key={e.id}
              id={e.id}
              className="scroll-mt-32"
            >
              <IdiomEntrySection entry={e} ordinal={i + 1} />
            </li>
          ))}
          {entries.length === 0 ? (
            <li className="text-center text-muted py-6 text-sm">검색 결과 없음</li>
          ) : null}
        </ol>
      </PageShell>
    );
  }

  function startAllIdiomListen() {
    const s = useListen.getState();
    s.setScope({ kind: "tier", tier: "idiom" });
    s.setArea({ vocab: false, idiom: true });
    navigate("/listen/play");
  }

  // Group index view (reached only if no groupId provided)
  return (
    <PageShell>
      <TopBar title="고사성어" subtitle={`${totalIdioms}개 · ${htGroups.length}개 그룹`} />

      {/* 전체 이어듣기 CTA */}
      <button
        type="button"
        onClick={startAllIdiomListen}
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
              성어 {totalListen}개를 순서대로 재생
            </div>
          </div>
        </div>
        <span className="text-sm text-primary">시작 →</span>
      </button>

      {/* 전체 보기 */}
      <Link
        to="/vocab/idioms/all"
        className="mt-3 card w-full flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Sparkles size={16} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm">전체 보기</div>
            <div className="text-[11px] text-muted mt-0.5">
              성어 {totalIdioms}개 평면 리스트
            </div>
          </div>
        </div>
        <span className="text-sm text-primary">시작 →</span>
      </Link>

      {/* 성어 그룹 목록 */}
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {htGroups.map((g) => (
          <li key={g.id}>
            <Link
              to={`/vocab/idioms/${g.id}`}
              className="card flex flex-col items-center text-center py-4 hover:shadow-lg transition"
            >
              <div className="font-medium text-sm">{g.title}</div>
              <div className="text-[10px] text-muted mt-0.5">{g.entries.length}개</div>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

function IdiomEntrySection({
  entry,
  ordinal,
}: {
  entry: import("@/types").IdiomEntry;
  ordinal: number;
}) {
  const hanziChars = useMemo(
    () => Array.from(entry.word).filter((c) => HANZI_RE.test(c)),
    [entry.word],
  );
  const hasHanzi = hanziChars.length > 0;
  // 성어는 charBreakdown 안에 음절 병음이 이미 있으므로 가능하면 거기서 가져옴.
  // 길이가 안 맞으면 단어 병음을 split.
  const perCharPinyin = useMemo<string[] | undefined>(() => {
    if (
      entry.charBreakdown.length === hanziChars.length &&
      entry.charBreakdown.every((c) => c.pinyin)
    ) {
      return entry.charBreakdown.map((c) => c.pinyin);
    }
    return hanziChars.length > 0
      ? splitPinyin(entry.pinyin, hanziChars.length) ?? undefined
      : undefined;
  }, [entry.charBreakdown, entry.pinyin, hanziChars.length]);

  return (
    <section className="py-5">
      {/* 헤더 — 번호 · 스피커 · 간체(병음) [성어] · 즐겨찾기 */}
      <div className="flex items-start gap-2">
        <span className="text-muted tabular-nums font-bold text-base mt-0.5">
          {ordinal}.
        </span>
        <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
            <span className="hanzi-text text-2xl leading-tight">{entry.word}</span>
            <span className="pinyin-text text-sm">({entry.pinyin})</span>
            {entry.pos ? (
              <span className="text-xs text-muted">[{entry.pos}]</span>
            ) : null}
          </div>
          <div className="mt-1 text-base">{entry.meaning}</div>
        </div>
        <FavStar id={entry.id} />
      </div>

      {/* 1) 의미 — 유래와 원문을 합쳐 하나의 "의미" 블록으로 표시 */}
      {entry.origin || entry.sourceText ? (
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">의미</div>
          {entry.origin ? (
            <div className="leading-relaxed">{entry.origin}</div>
          ) : null}
          {entry.sourceText ? (
            <div className={`flex items-start gap-2${entry.origin ? " mt-2" : ""}`}>
              <SpeakerButton
                text={extractZhPrefix(entry.sourceText)}
                label="원문 듣기"
                className="inline-flex items-center justify-center w-7 h-7 min-h-0 rounded text-fg hover:bg-primary-soft active:bg-primary-soft shrink-0"
              />
              <span className="flex-1">{entry.sourceText}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 2) 글자별 풀이 — 간체(병음) 형식 */}
      {entry.charBreakdown.length > 0 ? (
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">글자별 풀이</div>
          <ul className="ml-5 list-disc list-outside marker:text-muted space-y-1">
            {entry.charBreakdown.map((c, i) => (
              <li key={i}>
                <span className="font-medium">{c.char}{c.pinyin ? `(${c.pinyin})` : ""}</span>
                <span className="text-muted">:</span>{" "}
                <span>{c.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 3) 필순 — 헤더 옆에 "필순 자세히" 진입점 */}
      {hasHanzi ? (
        <div className="mt-4 text-sm">
          <div className="flex items-baseline justify-between mb-2">
            <div className="font-semibold">필순</div>
            <Link
              to={`/strokes/${entry.id}`}
              className="btn-ghost text-sm inline-flex items-center gap-1"
              aria-label="필순 자세히"
            >
              <PenLine size={14} aria-hidden />
              <span>필순 자세히</span>
            </Link>
          </div>
          <InlineStrokes word={entry.word} pinyinPerChar={perCharPinyin} />
        </div>
      ) : null}

      {/* 6) 유의어 — 스피커 좌측 정렬, 표시는 원문 그대로. */}
      {entry.synonyms.length > 0 ? (
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">유의어</div>
          <ul className="space-y-1">
            {entry.synonyms.map((s, i) => {
              const zh = extractZhPrefix(s);
              return (
                <li key={i} className="flex items-start gap-2">
                  <SpeakerButton
                    text={zh}
                    label={`${zh} 듣기`}
                    className="inline-flex items-center justify-center w-7 h-7 min-h-0 rounded text-fg hover:bg-primary-soft active:bg-primary-soft shrink-0"
                  />
                  <span className="flex-1">{s}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
