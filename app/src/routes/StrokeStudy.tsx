import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { SpeakerButton } from "@/components/SpeakerButton";
import { FavStar } from "@/components/FavStar";
import { WordStrokeCard } from "@/components/WordStrokeCard";
import {
  findIdiomEntry,
  findVocabEntry,
  getEntryById,
} from "@/lib/content";

const HANZI_RE = /\p{Script=Han}/u;

function hasHanzi(s: string): boolean {
  return Array.from(s).some((c) => HANZI_RE.test(c));
}

export default function StrokeStudy(): JSX.Element {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const target = useMemo(() => getEntryById(id), [id]);
  const neighbors = useMemo(() => {
    if (!target) return { prev: undefined, next: undefined };
    if (target.kind === "vocab") {
      const hit = findVocabEntry(id);
      if (!hit) return { prev: undefined, next: undefined };
      return {
        prev: hit.group.entries[hit.index - 1],
        next: hit.group.entries[hit.index + 1],
      };
    }
    const hit = findIdiomEntry(id);
    if (!hit) return { prev: undefined, next: undefined };
    return {
      prev: hit.group.entries[hit.index - 1],
      next: hit.group.entries[hit.index + 1],
    };
  }, [id, target]);

  if (!target) {
    return (
      <PageShell>
        <TopBar title="필순 학습" back />
        <p className="text-muted mt-8 text-center">단어 ID: {id}</p>
        <div className="text-center mt-4">
          <Link to="/strokes" className="text-primary text-sm">
            ← 필순 학습 목록으로
          </Link>
        </div>
      </PageShell>
    );
  }

  const sourceLabel = target.kind === "idiom" ? "성어" : "단어";
  const sourcePath =
    target.kind === "idiom" ? `/idiom/${target.id}` : `/vocab/${target.id}`;

  return (
    <PageShell>
      <TopBar title={target.word} subtitle={target.pinyin} back />

      {hasHanzi(target.word) ? (
        <section className="mt-2">
          {/* 큰 캔버스로 감상 */}
          <WordStrokeCard
            word={target.word}
            pinyin={target.pinyin}
            charSize={160}
          />
        </section>
      ) : (
        <p className="text-center text-muted mt-8 text-sm">
          한자가 없는 항목입니다.
        </p>
      )}

      <section className="mt-4 card">
        <div className="text-center">
          <div className="pinyin-text">{target.pinyin}</div>
          <div className="mt-1 text-base">{target.meaning}</div>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          <SpeakerButton text={target.word} pinyin={target.pinyin} />
          <FavStar id={target.id} />
          <Link
            to={sourcePath}
            className="btn-ghost text-sm inline-flex items-center"
          >
            {sourceLabel} 상세 →
          </Link>
        </div>
      </section>

      <div className="flex justify-between mt-6">
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
          onClick={() =>
            neighbors.prev && navigate(`/strokes/${neighbors.prev.id}`)
          }
          disabled={!neighbors.prev}
          aria-label="이전 항목"
        >
          <ChevronLeft size={18} aria-hidden />
          <span>이전</span>
        </button>
        <Link to="/strokes" className="btn-ghost text-sm">
          목록
        </Link>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1 disabled:opacity-40"
          onClick={() =>
            neighbors.next && navigate(`/strokes/${neighbors.next.id}`)
          }
          disabled={!neighbors.next}
          aria-label="다음 항목"
        >
          <span>다음</span>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </PageShell>
  );
}
