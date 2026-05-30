import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Play, Square, Headphones, PenLine } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { splitPinyin } from "@/lib/pinyin";
import { speakSequenceWithKorean, cancelSpeak } from "@/lib/tts";
import { useSettings } from "@/state/settings";
import {
  findHskThemeGroup,
  hskThemesByTier,
  type HskThemeVocabGroup,
  type HskThemeTier,
} from "@/lib/hsk-themes";
import type { VocabEntry } from "@/types";

const HANZI_RE = /\p{Script=Han}/u;

/**
 * HSK 테마별 단어 목록 — /vocab/theme/:groupId
 *
 * hsk-themes markdown 에서 빌드된 데이터(hsk-theme-vocab.json)를 표시.
 * 기존 SituationList 와 동일한 VocabEntrySection 형식.
 */
export default function HskThemeList() {
  const { groupId } = useParams<{ groupId?: string }>();
  const loc = useLocation();
  const navigate = useNavigate();
  const group = useMemo(
    () => (groupId ? findHskThemeGroup(groupId) : undefined),
    [groupId],
  );

  // 같은 tier 의 테마 목록 (chip nav 용)
  const siblings = useMemo(
    () => (group ? hskThemesByTier(group.tier) : []),
    [group],
  );

  const [filter, setFilter] = useState("");
  const [playing, setPlaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const ttsRate = useSettings((s) => s.ttsRate);
  const gap = useSettings((s) => s.ttsGapMs);

  useEffect(() => () => { abortRef.current?.abort(); cancelSpeak(); }, []);

  // Scroll to hashed entry
  useLayoutEffect(() => {
    if (!loc.hash) return;
    const id = decodeURIComponent(loc.hash.slice(1));
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [loc.hash, groupId]);

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
    // 단어(중국어) 재생 후 한국어 뜻까지 읽어 주어 듣기만으로 의미 학습 가능.
    await speakSequenceWithKorean(
      group.entries.map((e) => ({ zh: e.word || e.pinyin, ko: e.meaning })),
      { rate: ttsRate, gapMs: gap, signal: ac.signal },
    );
    setPlaying(false);
  }

  const tierLabel =
    group?.tier === "basic" ? "기초" : group?.tier === "mid" ? "중급" : "고급";
  const backTo =
    group?.tier === "basic"
      ? "/vocab/basic"
      : group?.tier === "mid"
      ? "/vocab/mid"
      : "/vocab/adv";

  return (
    <PageShell>
      <TopBar
        title={group ? group.title : "테마 단어"}
        subtitle={group?.titleZh}
        right={
          <button
            type="button"
            onClick={playAll}
            className="btn-ghost text-sm inline-flex items-center gap-1"
            aria-pressed={playing}
            aria-label={
              playing ? "전체 듣기 정지" : `${group?.title ?? "테마"} 전체 듣기`
            }
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

      {/* Chip nav — 같은 tier 의 다른 테마들 */}
      <nav
        aria-label={`${tierLabel} 테마 목록`}
        className="-mx-4 px-4 overflow-x-auto whitespace-nowrap py-2 border-b border-divider sticky top-14 bg-bg/95 backdrop-blur z-20"
      >
        <div className="flex gap-2">
          {siblings.map((g) => (
            <Link
              key={g.id}
              to={`/vocab/theme/${g.id}`}
              aria-current={g.id === groupId ? "page" : undefined}
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
      </nav>

      {!group ? (
        <div className="text-center text-muted mt-12">
          <div>테마를 찾을 수 없습니다.</div>
          <Link to={backTo} className="text-primary text-sm mt-2 inline-block">
            ← {tierLabel}으로
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-2 text-xs text-muted px-1">
            {group.entries.length}개 단어 · {tierLabel} 테마
          </div>

          <div className="mt-3">
            <input
              type="search"
              placeholder="테마 내 검색 (한자·병음·뜻)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-sm"
            />
          </div>

          <ol className="mt-3 list-none divide-y divide-divider">
            {entries.map((e, i) => (
              <li key={e.id} id={e.id} className="scroll-mt-32">
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

// ────────────────────────────────────────────────────────────────────
// VocabEntrySection — SituationList 와 동일 형식, 독립 컴포넌트
// ────────────────────────────────────────────────────────────────────

function VocabEntrySection({
  entry,
  ordinal,
}: {
  entry: VocabEntry;
  ordinal: number;
}) {
  const hanziChars = useMemo(
    () => Array.from(entry.word).filter((c) => HANZI_RE.test(c)),
    [entry.word],
  );
  const hasHanzi = hanziChars.length > 0;
  const perCharPinyin = useMemo(
    () =>
      hanziChars.length > 0
        ? splitPinyin(entry.pinyin, hanziChars.length) ?? undefined
        : undefined,
    [entry.pinyin, hanziChars.length],
  );

  return (
    <section className="py-5">
      {/* 헤더 — 번호 · 스피커 · 간체(병음) [품사] · 즐겨찾기 */}
      <div className="flex items-start gap-2">
        <span className="text-muted tabular-nums font-bold text-base mt-0.5">
          {ordinal}.
        </span>
        <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
            <span lang="zh-Hans" className="hanzi-text text-xl leading-tight">{entry.word}</span>
            <span lang="zh-Latn-pinyin" className="pinyin-text text-sm">({entry.pinyin})</span>
            {entry.pos ? (
              <span className="text-xs text-muted">[{entry.pos}]</span>
            ) : null}
          </div>
          <div className="mt-1 text-base">{entry.meaning}</div>
        </div>
        <FavStar id={entry.id} />
      </div>

      {/* 한자 풀이 + HSK 등급 + 필순 자세히
          인라인 필순(InlineStrokes)은 전용 페이지(/strokes/:id)와 중복이라 제거,
          헤더 우측의 "필순 자세히" 링크로만 진입한다. */}
      {entry.hanjaBreakdown.length > 0 || entry.hskLevel > 0 || hasHanzi ? (
        <div className="mt-4 text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-x-2">
            <div className="flex items-baseline flex-wrap gap-x-2">
              {entry.hanjaBreakdown.length > 0 || entry.hskLevel > 0 ? (
                <>
                  <span className="font-semibold">한자 풀이</span>
                  {entry.hskLevel > 0 ? (
                    <>
                      <span className="text-muted">/</span>
                      <span className="text-xs text-muted">
                        HSK 등급: {entry.hskLevel}급
                      </span>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
            {hasHanzi ? (
              <Link
                to={`/strokes/${entry.id}`}
                className="btn-ghost text-sm inline-flex items-center gap-1 shrink-0"
                aria-label="필순 자세히"
              >
                <PenLine size={14} aria-hidden />
                <span>필순 자세히</span>
              </Link>
            ) : null}
          </div>
          {entry.hanjaBreakdown.length > 0 ? (
            <ul className="ml-5 list-disc list-outside marker:text-muted space-y-1">
              {entry.hanjaBreakdown.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{h.char}({perCharPinyin?.[i] ?? ""})</span>
                  <span className="text-muted">:</span>{" "}
                  <span>{h.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
