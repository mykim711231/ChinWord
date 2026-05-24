import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import { FavStar } from "@/components/FavStar";
import { HanziWriterCard } from "@/components/HanziWriterCard";
import { WordCard } from "@/components/WordCard";
import { findVocabEntry } from "@/lib/content";
import { useSrs } from "@/state/srsStore";

export default function VocabDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hit = useMemo(() => findVocabEntry(id), [id]);
  const hasCard = useSrs((s) => !!s.cards[id]);
  const addCard = useSrs((s) => s.addCard);
  const removeCard = useSrs((s) => s.removeCard);

  useEffect(() => {
    if (!hit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") gotoNeighbor(-1);
      else if (e.key === "ArrowRight") gotoNeighbor(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!hit) {
    return (
      <PageShell>
        <TopBar title="단어를 찾을 수 없음" back />
        <p className="text-muted mt-8 text-center">단어 ID: {id}</p>
      </PageShell>
    );
  }

  const { entry, group, index } = hit;
  const prev = group.entries[index - 1];
  const next = group.entries[index + 1];

  function gotoNeighbor(dir: -1 | 1) {
    if (!hit) return;
    const target = group.entries[hit.index + dir];
    if (target) navigate(`/vocab/${target.id}`);
  }

  const uniqueChars = Array.from(entry.word).filter((c) => /\p{Script=Han}/u.test(c));

  return (
    <PageShell>
      <TopBar title={entry.word} subtitle={entry.pinyin} back />

      <WordCard
        word={entry.word}
        pinyin={entry.pinyin}
        pos={entry.pos}
        meaning={entry.meaning}
      />

      <div className="flex justify-center gap-2 mt-2">
        <SpeakerButton text={entry.word} />
        <FavStar id={entry.id} />
        <button
          type="button"
          onClick={() =>
            hasCard ? removeCard(entry.id) : addCard(entry.id, "vocab")
          }
          className="btn-ghost text-sm"
          aria-pressed={hasCard}
        >
          {hasCard ? "복습에서 제거" : "+ 복습에 추가"}
        </button>
      </div>

      {uniqueChars.length > 0 ? (
        <section className="mt-6">
          <h3 className="font-semibold mb-2">── 필순 (Stroke Order) ──</h3>
          <div className="grid grid-cols-2 gap-3">
            {uniqueChars.map((c) => (
              <HanziWriterCard key={c} char={c} />
            ))}
          </div>
        </section>
      ) : null}

      {entry.hanjaBreakdown.length > 0 ? (
        <section className="mt-6">
          <h3 className="font-semibold mb-2">── 한자 풀이 ──</h3>
          <ul className="card space-y-2">
            {entry.hanjaBreakdown.map((h, i) => (
              <li key={i}>
                <span className="hanzi-text text-lg mr-2">{h.char}</span>
                <span className="text-sm">{h.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h3 className="font-semibold mb-2">── 참고 ──</h3>
        <div className="card text-sm">
          HSK {entry.hskLevel || "-"}급 · 그룹: {group.title}
        </div>
      </section>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
          onClick={() => gotoNeighbor(-1)}
          disabled={!prev}
        >
          <ChevronLeft size={18} aria-hidden />
          <span>이전</span>
        </button>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
          onClick={() => gotoNeighbor(1)}
          disabled={!next}
        >
          <span>다음</span>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </PageShell>
  );
}
