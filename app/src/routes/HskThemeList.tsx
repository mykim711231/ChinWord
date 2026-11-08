import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Play, Square, Repeat, PenLine } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { splitPinyin } from "@/lib/pinyin";
import { speakSequenceWithKorean, speakAsync, cancelSpeak, unlock } from "@/lib/tts";
import {
  GUIDE_TEXT,
  PASS_COUNT,
  VOCAB_PASSES,
  type CaptionDisplay,
} from "@/lib/learningListening";
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

  // 5회 학습 듣기 상태 (index: 현재 단어, pass: 현재 회차)
  const [learn, setLearn] = useState<{ index: number; pass: number } | null>(
    null,
  );
  const [learnDone, setLearnDone] = useState(false);
  // 학습 듣기 방식: round = 전체 단어를 5바퀴(분산 학습), word = 단어 하나씩 5회
  const learnMode = useSettings((s) => s.learnMode);
  const chooseLearnMode = useSettings((s) => s.setLearnMode);
  // 단어 전체 듣기 중 현재 단어 인덱스 (자동 스크롤·강조용)
  const [playIndex, setPlayIndex] = useState<number | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); cancelSpeak(); }, []);

  // 테마가 바뀌면 재생 중단
  useEffect(() => {
    abortRef.current?.abort();
    cancelSpeak();
    setPlaying(false);
    setPlayIndex(null);
    setLearn(null);
    setLearnDone(false);
  }, [groupId]);

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

  function stopAll() {
    abortRef.current?.abort();
    cancelSpeak();
    setPlaying(false);
    setPlayIndex(null);
    setLearn(null);
  }

  /** 5회 학습 듣기 — 회차마다 표시를 바꿔 가며 전체 단어를 중국어로 재생. */
  async function playLearning() {
    if (!group) return;
    if (learn) {
      stopAll();
      return;
    }
    stopAll();
    unlock();
    setFilter("");
    setLearnDone(false);
    const ac = new AbortController();
    abortRef.current = ac;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        ac.signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(t);
            resolve();
          },
          { once: true },
        );
      });
    const list = group.entries;
    try {
      const step = async (index: number, pass: number): Promise<boolean> => {
        if (ac.signal.aborted) return false;
        setLearn({ index, pass });
        const lead = VOCAB_PASSES[pass].leadMs ?? 0;
        if (lead) {
          await sleep(lead);
          if (ac.signal.aborted) return false;
        }
        await speakAsync(list[index].word || list[index].pinyin, {
          rate: ttsRate,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return false;
        await sleep(gap);
        return !ac.signal.aborted;
      };
      if (learnMode === "word") {
        // 단어 하나를 5회(회차별 표시 변화) 끝낸 뒤 다음 단어로
        for (let index = 0; index < list.length; index++) {
          for (let pass = 0; pass < VOCAB_PASSES.length; pass++) {
            if (!(await step(index, pass))) return;
          }
        }
      } else {
        // 전체 단어를 한 바퀴씩, 5바퀴
        for (let pass = 0; pass < VOCAB_PASSES.length; pass++) {
          for (let index = 0; index < list.length; index++) {
            if (!(await step(index, pass))) return;
          }
        }
      }
      if (!ac.signal.aborted) setLearnDone(true);
    } finally {
      if (abortRef.current === ac) setLearn(null);
    }
  }

  // 재생 중 단어를 화면 가운데로 따라가기
  useEffect(() => {
    if (!group) return;
    const idx = learn ? learn.index : playIndex;
    if (idx === null) return;
    const id = group.entries[idx]?.id;
    if (!id) return;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [learn?.index, learn?.pass, playIndex, group]); // eslint-disable-line react-hooks/exhaustive-deps

  async function playAll() {
    if (!group) return;
    if (playing || learn) {
      stopAll();
      return;
    }
    setLearnDone(false);
    unlock();
    const ac = new AbortController();
    abortRef.current = ac;
    setPlaying(true);
    setFilter("");
    // 단어(중국어) 재생 후 한국어 뜻까지 읽어 주어 듣기만으로 의미 학습 가능.
    await speakSequenceWithKorean(
      group.entries.map((e) => ({ zh: e.word || e.pinyin, ko: e.meaning })),
      {
        rate: ttsRate,
        gapMs: gap,
        signal: ac.signal,
        onItem: (i) => setPlayIndex(i),
      },
    );
    if (abortRef.current === ac) {
      setPlaying(false);
      setPlayIndex(null);
    }
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={playAll}
              disabled={learn !== null}
              aria-pressed={playing}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary text-primary text-sm font-semibold px-3 py-1.5 disabled:opacity-40"
            >
              {playing ? (
                <Square size={14} aria-hidden />
              ) : (
                <Play size={14} aria-hidden />
              )}
              {playing ? "멈추기" : "단어 전체 듣기"}
            </button>
            <button
              type="button"
              onClick={playLearning}
              disabled={playing}
              aria-pressed={learn !== null}
              aria-describedby="learning-listening-guide"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary text-primary text-sm font-semibold px-3 py-1.5 disabled:opacity-40"
            >
              {learn ? (
                <Square size={14} aria-hidden />
              ) : (
                <Repeat size={14} aria-hidden />
              )}
              {learn ? "학습 듣기 멈추기" : "단어 5회 학습 듣기"}
            </button>
            <div
              role="group"
              aria-label="학습 듣기 방식"
              className="inline-flex rounded-full border border-divider overflow-hidden text-xs"
            >
              {(
                [
                  ["round", "전체 5바퀴"],
                  ["word", "단어별 5회"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  disabled={learn !== null}
                  aria-pressed={learnMode === m}
                  onClick={() => chooseLearnMode(m)}
                  className={
                    "px-3 py-1.5 disabled:opacity-60 " +
                    (learnMode === m ? "bg-primary text-white" : "text-fg")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {learn ? (
              <span role="status" className="text-xs text-muted">
                {learn.pass + 1}/{PASS_COUNT}회 · {VOCAB_PASSES[learn.pass].label} ·{" "}
                {learn.index + 1}/{group.entries.length}단어
              </span>
            ) : null}
          </div>
          {learnDone ? (
            <p role="status" className="mt-2 text-sm text-primary">
              {PASS_COUNT}회 학습 듣기를 마쳤어요.
            </p>
          ) : null}
          <p id="learning-listening-guide" className="mt-2 text-xs text-muted">
            {GUIDE_TEXT}{" "}
            {learnMode === "word"
              ? "단어 하나를 5회 끝낸 뒤 다음 단어로 넘어가요(발음 따라하기에 좋아요)."
              : "매회 단어 전체를 듣고 다시 처음부터 돌아요(간격을 두어 기억에 오래 남아요)."}
          </p>

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
                <VocabEntrySection
                  entry={e}
                  ordinal={i + 1}
                  display={learn ? VOCAB_PASSES[learn.pass].display : undefined}
                  active={
                    group.entries[learn ? learn.index : playIndex ?? -1]?.id === e.id
                  }
                />
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
  display,
  active,
}: {
  entry: VocabEntry;
  ordinal: number;
  /** 5회 학습 듣기 중 회차별 표시 설정 (없으면 모두 표시). */
  display?: CaptionDisplay;
  active?: boolean;
}) {
  const showZh = display?.showZh ?? true;
  const showPinyin = display?.showPinyin ?? true;
  const showKo = display?.showKo ?? true;
  const full = !display || (showZh && showPinyin && showKo);
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
    <section
      className={
        "py-5 transition-colors " +
        (active ? "bg-primary-soft/60 ring-2 ring-primary rounded-lg -mx-2 px-2" : "")
      }
    >
      {/* 헤더 — 번호 · 스피커 · 간체(병음) [품사] · 즐겨찾기 */}
      <div className="flex items-start gap-2">
        <span className="text-muted tabular-nums font-bold text-base mt-0.5">
          {ordinal}.
        </span>
        <SpeakerButton text={entry.word} pinyin={entry.pinyin} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
            <span lang="zh-Hans" className={"hanzi-text text-xl leading-tight" + (showZh ? "" : " invisible")}>{entry.word}</span>
            <span lang="zh-Latn-pinyin" className={"pinyin-text text-sm" + (showPinyin ? "" : " invisible")}>({entry.pinyin})</span>
            {entry.pos ? (
              <span className="text-xs text-muted">[{entry.pos}]</span>
            ) : null}
          </div>
          <div className={"mt-1 text-base" + (showKo ? "" : " invisible")}>{entry.meaning}</div>
        </div>
        <FavStar id={entry.id} />
      </div>

      {/* 한자 풀이 + HSK 등급 + 필순 자세히
          인라인 필순(InlineStrokes)은 전용 페이지(/strokes/:id)와 중복이라 제거,
          헤더 우측의 "필순 자세히" 링크로만 진입한다. */}
      {full && (entry.hanjaBreakdown.length > 0 || entry.hskLevel > 0 || hasHanzi) ? (
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
