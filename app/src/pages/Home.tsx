import { Link } from "react-router-dom";
import { useSrsStore } from "@/stores/srsStore";
import { getPhases } from "@/data/lookup";

export function Home() {
  const dueCount = useSrsStore((s) => s.dueCount());
  const phases = getPhases();

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>ChinVoca 中国语</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          북경 표준어 단어·고사성어 학습
        </p>
      </header>

      <Link
        to="/flashcards"
        className="block rounded-xl p-4 no-underline"
        style={{ backgroundColor: "var(--color-primary-soft)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold" style={{ color: "var(--color-primary)" }}>
              오늘의 복습
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {dueCount > 0
                ? `복습할 카드 ${dueCount}개가 있습니다`
                : "복습할 카드가 없습니다"}
            </p>
          </div>
          <span className="text-2xl">{dueCount > 0 ? "📚" : "✅"}</span>
        </div>
      </Link>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-text)" }}>
          학습 단계
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {phases.map((phase) => (
            <Link
              key={phase.id}
              to={`/situations?phase=${phase.id}`}
              className="block rounded-xl p-4 no-underline"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                {phase.label}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                단어 {phase.vocabGroups.length}개 그룹 / 성어 {phase.idiomGroups.length}개 그룹
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/situations"
          className="block rounded-xl p-4 no-underline"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <p className="text-2xl mb-1">📂</p>
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>상황별 단어</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>장소·상황별 어휘 학습</p>
        </Link>
        <Link
          to="/idioms"
          className="block rounded-xl p-4 no-underline"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <p className="text-2xl mb-1">📜</p>
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>고사성어</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>사자성어·고사성어 학습</p>
        </Link>
        <Link
          to="/search"
          className="block rounded-xl p-4 no-underline"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <p className="text-2xl mb-1">🔍</p>
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>검색</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>단어·성어 찾기</p>
        </Link>
        <Link
          to="/settings"
          className="block rounded-xl p-4 no-underline"
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
        >
          <p className="text-2xl mb-1">⚙</p>
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>설정</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>글꼴·테마·TTS</p>
        </Link>
      </section>
    </div>
  );
}
