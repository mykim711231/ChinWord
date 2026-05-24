import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import { FavStar } from "@/components/FavStar";
import { WordCard } from "@/components/WordCard";
import { findIdiomEntry } from "@/lib/content";
import { useSrs } from "@/state/srsStore";

export default function IdiomDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hit = useMemo(() => findIdiomEntry(id), [id]);
  const hasCard = useSrs((s) => !!s.cards[id]);
  const addCard = useSrs((s) => s.addCard);
  const removeCard = useSrs((s) => s.removeCard);

  if (!hit) {
    return (
      <PageShell>
        <TopBar title="성어를 찾을 수 없음" back />
      </PageShell>
    );
  }
  const { entry, group, index } = hit;
  const prev = group.entries[index - 1];
  const next = group.entries[index + 1];

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
            hasCard ? removeCard(entry.id) : addCard(entry.id, "idiom")
          }
          className="btn-ghost text-sm"
          aria-pressed={hasCard}
        >
          {hasCard ? "복습에서 제거" : "+ 복습에 추가"}
        </button>
      </div>

      {entry.sourceText ? (
        <section className="mt-6">
          <h3 className="font-semibold mb-2">── 원문 ──</h3>
          <div className="card text-sm">{entry.sourceText}</div>
        </section>
      ) : null}

      {entry.origin ? (
        <section className="mt-6">
          <h3 className="font-semibold mb-2">── 유래 ──</h3>
          <div className="card text-sm leading-relaxed">{entry.origin}</div>
        </section>
      ) : null}

      {entry.charBreakdown.length > 0 ? (
        <section className="mt-6">
          <h3 className="font-semibold mb-2">── 글자별 풀이 ──</h3>
          <ul className="card space-y-2">
            {entry.charBreakdown.map((c, i) => (
              <li key={i}>
                <span className="hanzi-text text-lg mr-2">{c.char}</span>
                <span className="pinyin-text mr-2">({c.pinyin})</span>
                <span className="text-sm">{c.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {entry.synonyms.length > 0 ? (
        <section className="mt-6">
          <h3 className="font-semibold mb-2">── 유의어 ──</h3>
          <ul className="card space-y-1 text-sm">
            {entry.synonyms.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex justify-between mt-6">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => prev && navigate(`/idiom/${prev.id}`)}
          disabled={!prev}
        >
          ◀ 이전
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => next && navigate(`/idiom/${next.id}`)}
          disabled={!next}
        >
          다음 ▶
        </button>
      </div>
    </PageShell>
  );
}
