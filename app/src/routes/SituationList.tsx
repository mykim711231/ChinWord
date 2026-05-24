import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Play, Square } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { contentMeta, findVocabGroup } from "@/lib/content";
import { speakSequence, cancelSpeak } from "@/lib/tts";
import { useSettings } from "@/state/settings";

export default function SituationList() {
  const { groupId } = useParams<{ groupId?: string }>();
  const selectedId = groupId ?? contentMeta.vocab[0]?.id;
  const group = useMemo(() => (selectedId ? findVocabGroup(selectedId) : undefined), [selectedId]);
  const [filter, setFilter] = useState("");
  const [playing, setPlaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const ttsRate = useSettings((s) => s.ttsRate);
  const gap = useSettings((s) => s.ttsGapMs);

  useEffect(() => () => { abortRef.current?.abort(); cancelSpeak(); }, []);

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
      group.entries.map((e) => e.word),
      { rate: ttsRate, gapMs: gap, signal: ac.signal },
    );
    setPlaying(false);
  }

  return (
    <PageShell>
      <TopBar
        title={group ? group.title : "상황별 단어"}
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
                <span>이어듣기</span>
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
          <div className="mt-4">
            <input
              type="search"
              placeholder="그룹 내 검색 (한자·병음·뜻)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-sm"
            />
          </div>

          <ul className="mt-3 divide-y divide-divider/60 rounded-card border border-divider/60 bg-surface">
            {entries.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-3">
                <span className="text-xs text-muted w-6 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link to={`/vocab/${e.id}`} className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="hanzi-text text-xl">{e.word}</span>
                    <span className="pinyin-text text-sm truncate">{e.pinyin}</span>
                  </div>
                  <div className="text-sm text-muted truncate">{e.meaning}</div>
                </Link>
                <FavStar id={e.id} />
              </li>
            ))}
            {entries.length === 0 ? (
              <li className="text-center text-muted py-6 text-sm">검색 결과 없음</li>
            ) : null}
          </ul>
        </>
      )}
    </PageShell>
  );
}
