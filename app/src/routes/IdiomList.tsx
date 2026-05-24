import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { FavStar } from "@/components/FavStar";
import { SpeakerButton } from "@/components/SpeakerButton";
import { contentMeta, findIdiomGroup, randomIdiom } from "@/lib/content";

export default function IdiomList() {
  const { groupId } = useParams<{ groupId?: string }>();
  const group = useMemo(
    () => (groupId ? findIdiomGroup(groupId) : undefined),
    [groupId],
  );

  if (groupId && group) {
    return (
      <PageShell>
        <TopBar title={group.title} subtitle={group.titleZh} back />
        <ul className="mt-3 divide-y divide-divider/60 rounded-card border border-divider/60 bg-surface">
          {group.entries.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-3">
              <span className="text-xs text-muted w-6 text-right">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link to={`/idiom/${e.id}`} className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="hanzi-text text-xl">{e.word}</span>
                  <span className="pinyin-text text-sm truncate">{e.pinyin}</span>
                </div>
                <div className="text-sm text-muted truncate">{e.meaning}</div>
              </Link>
              <FavStar id={e.id} />
            </li>
          ))}
        </ul>
      </PageShell>
    );
  }

  // Group index view
  const featured = useMemo(() => randomIdiom(), []);
  return (
    <PageShell>
      <TopBar title="고사성어" subtitle="9개 주제" />
      <section className="mt-2">
        <div className="text-xs text-muted px-1 mb-1 inline-flex items-center gap-1">
          <Sparkles size={12} aria-hidden />
          <span>오늘의 성어</span>
        </div>
        <Link to={`/idiom/${featured.entry.id}`} className="card block hover:shadow-lg transition">
          <div className="text-center">
            <div className="hanzi-text text-3xl">{featured.entry.word}</div>
            <div className="pinyin-text mt-1">{featured.entry.pinyin}</div>
            <div className="mt-2 text-base">{featured.entry.meaning}</div>
            <div className="text-xs text-muted mt-1">— {featured.group.title}</div>
          </div>
          <div className="flex justify-center mt-2">
            <SpeakerButton text={featured.entry.word} />
          </div>
        </Link>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold mb-2 px-1">주제별</h2>
        <div className="grid grid-cols-2 gap-3">
          {contentMeta.idioms.map((g) => (
            <Link
              key={g.id}
              to={`/idioms/${g.id}`}
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
