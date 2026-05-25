import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useLayoutEffect, useMemo, useState } from "react";
import { Sparkles, Headphones, PenLine } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { InlineStrokes } from "@/components/InlineStrokes";
import { contentMeta, findIdiomGroup, randomIdiom } from "@/lib/content";
import { splitPinyin, extractZhPrefix } from "@/lib/pinyin";
import { useListen } from "@/state/listen";

const HANZI_RE = /\p{Script=Han}/u;

export default function IdiomList() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  const group = useMemo(
    () => (groupId ? findIdiomGroup(groupId) : undefined),
    [groupId],
  );
  const [filter, setFilter] = useState("");

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
    s.setScope({ kind: "lesson", groupId: id });
    s.setArea({ vocab: false, idiom: true });
    navigate("/listen/play");
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
            {contentMeta.idioms.map((g) => (
              <Link
                key={g.id}
                to={`/idiom-group/${g.id}`}
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

        {/* Entry stack — 플레인 페이지 섹션, 항목 간 divider. 카드 메타포는 Flashcards 전용. */}
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

  // Group index view (reached only if no groupId provided)
  const featured = useMemo(() => randomIdiom(), []);
  return (
    <PageShell>
      <TopBar title="고사성어" subtitle={`${contentMeta.idioms.length}개 주제`} />
      <section className="mt-2">
        <div className="text-xs text-muted px-1 mb-1 inline-flex items-center gap-1">
          <Sparkles size={12} aria-hidden />
          <span>오늘의 성어</span>
        </div>
        <Link
          to={`/idiom-group/${featured.group.id}#${encodeURIComponent(featured.entry.id)}`}
          className="card block hover:shadow-lg transition"
        >
          <div className="text-center">
            <div className="hanzi-text text-3xl">{featured.entry.word}</div>
            <div className="pinyin-text mt-1">{featured.entry.pinyin}</div>
            <div className="mt-2 text-base">{featured.entry.meaning}</div>
            <div className="text-xs text-muted mt-1">— {featured.group.title}</div>
          </div>
          <div className="flex justify-center mt-2">
            <SpeakerButton text={featured.entry.word} pinyin={featured.entry.pinyin} />
          </div>
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-2 px-1">주제별</h2>
        <div className="grid grid-cols-2 gap-3">
          {contentMeta.idioms.map((g) => (
            <Link
              key={g.id}
              to={`/idiom-group/${g.id}`}
              className="card flex flex-col items-center text-center hover:shadow-lg transition py-5"
            >
              <div className="font-semibold">{g.title}</div>
              <div className="text-xs text-muted mt-0.5">{g.titleZh}</div>
              <div className="text-[11px] text-muted mt-1">{g.count}개</div>
            </Link>
          ))}
        </div>
      </section>
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
      {/* H3 헤더 — 큰 한자(text-3xl) 위에 글자별 병음(루비), 우측 [품사]/⭐, 뜻은 다음 줄. */}
      <div className="flex items-end gap-2">
        <span className="text-muted tabular-nums font-bold text-base pb-1">
          {ordinal}.
        </span>
        <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
        <div className="flex-1 min-w-0">
          <div className="flex items-end flex-wrap gap-x-3 gap-y-1">
            <h3 className="flex items-end gap-2 m-0">
              {hanziChars.map((ch, i) => (
                <span
                  key={i}
                  className="inline-flex flex-col items-center leading-none"
                >
                  {perCharPinyin?.[i] ? (
                    <span className="pinyin-text text-xs mb-1 leading-none">
                      {perCharPinyin[i]}
                    </span>
                  ) : null}
                  <span className="text-3xl leading-none">{ch}</span>
                </span>
              ))}
            </h3>
            {entry.pos ? (
              <span className="text-xs text-muted pb-1">[{entry.pos}]</span>
            ) : null}
          </div>
          <div className="mt-2 text-base">{entry.meaning}</div>
        </div>
        <FavStar id={entry.id} />
      </div>

      {/* 2) 글자별 풀이 — 글자는 본문 글자 크기와 동일 */}
      {entry.charBreakdown.length > 0 ? (
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">글자별 풀이</div>
          <ul className="ml-5 list-disc list-outside marker:text-muted space-y-1">
            {entry.charBreakdown.map((c, i) => (
              <li key={i}>
                <span className="font-medium mr-1">{c.char}</span>
                {c.pinyin ? (
                  <span className="pinyin-text text-sm mr-1">({c.pinyin})</span>
                ) : null}
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

      {/* 4) 유래 */}
      {entry.origin ? (
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">유래</div>
          <div className="leading-relaxed">{entry.origin}</div>
        </div>
      ) : null}

      {/* 5) 원문 — 스피커 좌측 정렬(헤딩과 동일 패턴), 매니페스트는 한자 본문만 키로. */}
      {entry.sourceText ? (
        <div className="mt-4 text-sm">
          <div className="font-semibold mb-1">원문</div>
          <div className="flex items-start gap-2">
            <SpeakerButton
              text={extractZhPrefix(entry.sourceText)}
              label="원문 듣기"
              className="inline-flex items-center justify-center w-7 h-7 min-h-0 rounded text-fg hover:bg-primary-soft active:bg-primary-soft shrink-0"
            />
            <span className="flex-1">{entry.sourceText}</span>
          </div>
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
