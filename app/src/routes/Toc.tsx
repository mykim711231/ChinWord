import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Headphones } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import {
  buildListenQueue,
  lessonsByVolume,
  type LessonRow,
  type Volume,
} from "@/lib/content";
import { useListen } from "@/state/listen";

const VOLS: Volume[] = [1, 2, 3];

function kindFromPath(pathname: string): "vocab" | "idiom" | undefined {
  if (pathname.startsWith("/words")) return "vocab";
  if (pathname.startsWith("/idioms")) return "idiom";
  return undefined; // legacy /toc — show both
}

export default function Toc() {
  const loc = useLocation();
  const navigate = useNavigate();
  const kind = kindFromPath(loc.pathname);

  // Flat lesson list grouped by volume (for section headers only).
  const sections = useMemo<Array<{ vol: Volume; rows: LessonRow[] }>>(() => {
    return VOLS.map((vol) => ({
      vol,
      rows: lessonsByVolume(vol, kind),
    })).filter((s) => s.rows.length > 0);
  }, [kind]);

  const totalLessons = sections.reduce((n, s) => n + s.rows.length, 0);

  const title =
    kind === "vocab" ? "단어 목차" : kind === "idiom" ? "성어 목차" : "목차";

  const totalCount = useMemo(
    () =>
      buildListenQueue({
        scope: { kind: "all" },
        area: {
          vocab: kind !== "idiom",
          idiom: kind !== "vocab",
        },
      }).length,
    [kind],
  );

  function startAllListen() {
    const s = useListen.getState();
    s.setScope({ kind: "all" });
    s.setArea({ vocab: kind !== "idiom", idiom: kind !== "vocab" });
    navigate("/listen/play");
  }

  return (
    <PageShell>
      <TopBar title={title} subtitle={`${totalLessons}과`} />

      {/* 전체 이어듣기 CTA */}
      <button
        type="button"
        onClick={startAllListen}
        disabled={totalCount === 0}
        className="card w-full flex items-center justify-between hover:shadow-lg transition disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Headphones size={18} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">전체 이어듣기</div>
            <div className="text-xs text-muted mt-0.5">
              {kind === "idiom" ? "성어" : kind === "vocab" ? "단어" : "전체"}{" "}
              {totalCount}개를 권/과 순서대로 재생
            </div>
          </div>
        </div>
        <span className="text-sm text-primary">시작 →</span>
      </button>

      {/* 권별 섹션 — 탭 없이 평탄 목록 */}
      {sections.map(({ vol, rows }) => (
        <section key={vol} className="mt-5">
          <h2 className="text-xs font-semibold text-muted px-1 mb-2">
            {vol}권 · {rows.length}과
          </h2>
          <ul className="divide-y divide-divider/60 rounded-card border border-divider/60 bg-surface">
            {rows.map((l) => {
              const to =
                l.kind === "vocab"
                  ? `/situations/${l.groupId}`
                  : `/idiom-group/${l.groupId}`;
              return (
                <li key={l.groupId}>
                  <NavLink
                    to={to}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-bg/50 transition"
                  >
                    <span className="text-xs text-muted tabular-nums whitespace-nowrap">
                      {vol}권.{String(l.no).padStart(2, "0")}과.
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">
                        {l.titleKo}
                      </span>
                      <span className="block text-xs text-muted truncate">
                        <span className="hanzi-text">{l.titleZh}</span>
                        <span> · </span>
                        <span className="pinyin-text">{l.titlePinyin}</span>
                      </span>
                    </span>
                    <span className="text-[11px] text-muted whitespace-nowrap">
                      {l.count}개
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {totalLessons === 0 ? (
        <p className="text-center text-muted py-8 text-sm">
          아직 등록된 강의가 없습니다.
        </p>
      ) : null}
    </PageShell>
  );
}
