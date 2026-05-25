import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Play, Square, Headphones, PenLine } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { InlineStrokes } from "@/components/InlineStrokes";
import { contentMeta, findVocabGroup } from "@/lib/content";
import { splitPinyin } from "@/lib/pinyin";
import { speakSequence, cancelSpeak } from "@/lib/tts";
import { useSettings } from "@/state/settings";
import { useListen } from "@/state/listen";

const HANZI_RE = /\p{Script=Han}/u;

export default function SituationList() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  const selectedId = groupId ?? contentMeta.vocab[0]?.id;
  const group = useMemo(() => (selectedId ? findVocabGroup(selectedId) : undefined), [selectedId]);
  const [filter, setFilter] = useState("");
  const [playing, setPlaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const ttsRate = useSettings((s) => s.ttsRate);
  const gap = useSettings((s) => s.ttsGapMs);

  useEffect(() => () => { abortRef.current?.abort(); cancelSpeak(); }, []);

  // Scroll to hashed entry on mount / hash change
  useLayoutEffect(() => {
    if (!loc.hash) return;
    const id = decodeURIComponent(loc.hash.slice(1));
    // wait one frame for entries to render
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [loc.hash, selectedId]);

  const entries = useMemo(() => {
    if (!group) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return group.entries;
    return group.entries.filter(
      (e) =>
        e.word.includes(q) ||
        e.pinyin.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q),
    );
  }, [group, filter]);

  async function playAll() {
    if (!group) return;
    if (playing) {
      abortRef.current?.abort();
      cancelSpeak();
      setPlaying(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setPlaying(true);
    await speakSequence(
      group.entries.map((e) => e.pinyin || e.word),
      { rate: ttsRate, gapMs: gap, signal: ac.signal },
    );
    setPlaying(false);
  }

  function startLessonListen() {
    if (!group) return;
    abortRef.current?.abort();
    cancelSpeak();
    const s = useListen.getState();
    s.setScope({ kind: "lesson", groupId: group.id });
    s.setArea({ vocab: true, idiom: false });
    navigate("/listen/play");
  }

  return (
    <PageShell>
      <TopBar
        title={group ? group.title : "상황별 단어"}
        subtitle={group?.titleZh}
        back
        right={
          <button
            type="button"
            onClick={playAll}
            className="btn-ghost text-sm inline-flex items-center gap-1"
            aria-pressed={playing}
          >
            {playing ? (
              <>
                <Square size={14} aria-hidden />
                <span>정지</span>
              </>
            ) : (
              <>
                <Play size={14} aria-hidden />
                <span>듣기</span>
              </>
            )}
          </button>
        }
      />

      <div className="-mx-4 px-4 overflow-x-auto whitespace-nowrap py-2 border-b border-divider sticky top-14 bg-bg/95 backdrop-blur z-20">
        <div className="flex gap-2">
          {contentMeta.vocab.map((g) => (
            <Link
              key={g.id}
              to={`/situations/${g.id}`}
              className={
                "rounded-chip px-3 py-1 text-sm border " +
                (g.id === selectedId
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-fg border-divider")
              }
            >
              {g.title}
            </Link>
          ))}
        </div>
      </div>

      {!group ? (
        <div className="text-center text-muted mt-12">그룹을 찾을 수 없습니다.</div>
      ) : (
        <>
          <button
            type="button"
            onClick={startLessonListen}
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

          {/* Entry stack — plain page sections, dividers between entries.
              카드 메타포는 Flashcards 전용 — 본 페이지는 한 과를 통째로 스크롤하는 형식. */}
          <ol className="mt-3 list-none divide-y divide-divider">
            {entries.map((e, i) => (
              <li
                key={e.id}
                id={e.id}
                className="scroll-mt-32"
              >
                <VocabEntrySection entry={e} ordinal={i + 1} />
              </li>
            ))}
            {entries.length === 0 ? (
              <li className="text-center text-muted py-6 text-sm">검색 결과 없음</li>
            ) : null}
          </ol>
        </>
      )}
    </PageShell>
  );
}

function VocabEntrySection({
  entry,
  ordinal,
}: {
  entry: import("@/types").VocabEntry;
  ordinal: number;
}) {
  const hanziChars = useMemo(
    () => Array.from(entry.word).filter((c) => HANZI_RE.test(c)),
    [entry.word],
  );
  const hasHanzi = hanziChars.length > 0;
  // 단어 병음을 글자 수에 맞춰 음절 단위로 분리. 불일치 시 null → 라벨 생략.
  const perCharPinyin = useMemo(
    () =>
      hanziChars.length > 0
        ? splitPinyin(entry.pinyin, hanziChars.length) ?? undefined
        : undefined,
    [entry.pinyin, hanziChars.length],
  );

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

      {/* 2) 한자 풀이 + HSK — 헤더에 등급 병기 */}
      {entry.hanjaBreakdown.length > 0 || entry.hskLevel > 0 ? (
        <div className="mt-4 text-sm">
          <div className="mb-1 flex items-baseline flex-wrap gap-x-2">
            <span className="font-semibold">한자 풀이</span>
            {entry.hskLevel > 0 ? (
              <>
                <span className="text-muted">/</span>
                <span className="text-xs text-muted">
                  HSK 등급: {entry.hskLevel}급
                </span>
              </>
            ) : null}
          </div>
          {entry.hanjaBreakdown.length > 0 ? (
            <ul className="ml-5 list-disc list-outside marker:text-muted space-y-1">
              {entry.hanjaBreakdown.map((h, i) => (
                <li key={i}>
                  <span className="font-medium mr-1">{h.char}</span>
                  {perCharPinyin?.[i] ? (
                    <span className="pinyin-text text-sm mr-1">
                      ({perCharPinyin[i]})
                    </span>
                  ) : null}
                  <span className="text-muted">:</span>{" "}
                  <span>{h.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* 3) 필순 — 헤더 옆에 "필순 자세히" 진입점, 본문은 글자 사이즈 SVG */}
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

    </section>
  );
}
