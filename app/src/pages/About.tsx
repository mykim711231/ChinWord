export function About() {
  return (
    <div className="space-y-5">
      <button
        onClick={() => window.history.back()}
        className="text-sm bg-transparent border-none cursor-pointer"
        style={{ color: "var(--color-text-muted)" }}
      >
        ‹ 뒤로
      </button>

      <div className="text-center py-8 space-y-3">
        <p className="text-4xl">🀄</p>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          ChinVoca 中国语
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          북경 표준어 단어·고사성어 학습 PWA
        </p>
      </div>

      <div
        className="rounded-xl p-4 space-y-2 text-sm"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
      >
        <div className="flex justify-between">
          <span style={{ color: "var(--color-text-muted)" }}>버전</span>
          <span style={{ color: "var(--color-text)" }}>1.0.0</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--color-text-muted)" }}>기술 스택</span>
          <span style={{ color: "var(--color-text)" }}>Vite + React + TypeScript</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--color-text-muted)" }}>배포</span>
          <span style={{ color: "var(--color-text)" }}>GitHub Pages (PWA)</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: "var(--color-text-muted)" }}>데이터</span>
          <span style={{ color: "var(--color-text)" }}>440 단어 + 72 고사성어</span>
        </div>
      </div>

      <div
        className="rounded-xl p-4 space-y-2 text-sm"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
      >
        <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
          학습 방법
        </h2>
        <ul className="space-y-1 list-disc list-inside" style={{ color: "var(--color-text-muted)" }}>
          <li>상황별로 구성된 단어를 학습합니다</li>
          <li>고사성어의 유래와 글자별 풀이를 익힙니다</li>
          <li>플래시카드 복습으로 장기 기억을 강화합니다</li>
          <li>Leitner 박스 시스템으로 복습 주기를 최적화합니다</li>
        </ul>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
        © 2026 ChinVoca. MIT License.
      </p>
    </div>
  );
}
