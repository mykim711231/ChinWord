import { Link } from "react-router-dom";
import { useSettingsStore, type FontSize, type ThemeMode, type DisplayMode } from "@/stores/settingsStore";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const fontSizes: { key: FontSize; label: string; desc: string }[] = [
  { key: "sm", label: "작게", desc: "0.9x" },
  { key: "md", label: "보통", desc: "1.0x" },
  { key: "lg", label: "크게", desc: "1.2x" },
  { key: "xl", label: "아주 크게", desc: "1.4x" },
];

const themes: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "시스템" },
  { key: "light", label: "라이트" },
  { key: "dark", label: "다크" },
];

const displayModes: { key: DisplayMode; label: string }[] = [
  { key: "all", label: "한자 + 병음 + 뜻" },
  { key: "hanzi-pinyin", label: "한자 + 병음" },
  { key: "hanzi", label: "한자만" },
];

export function Settings() {
  const {
    fontSize,
    theme,
    displayMode,
    ttsRate,
    ttsGap,
    setFontSize,
    setTheme,
    setDisplayMode,
    setTtsRate,
    setTtsGap,
  } = useSettingsStore();

  const { canInstall, install } = useInstallPrompt();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          설정
        </h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          글꼴 크기
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {fontSizes.map((fs) => (
            <button
              key={fs.key}
              onClick={() => setFontSize(fs.key)}
              className="py-2.5 rounded-xl text-sm font-medium border cursor-pointer"
              style={{
                backgroundColor: fontSize === fs.key ? "var(--color-primary)" : "var(--color-surface)",
                color: fontSize === fs.key ? "#fff" : "var(--color-text)",
                borderColor: fontSize === fs.key ? "var(--color-primary)" : "var(--color-divider)",
              }}
            >
              <p>{fs.label}</p>
              <p className="text-xs opacity-70">{fs.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          테마
        </h2>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border cursor-pointer"
              style={{
                backgroundColor: theme === t.key ? "var(--color-primary)" : "var(--color-surface)",
                color: theme === t.key ? "#fff" : "var(--color-text)",
                borderColor: theme === t.key ? "var(--color-primary)" : "var(--color-divider)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          단어 표시 모드
        </h2>
        <div className="flex flex-col gap-2">
          {displayModes.map((dm) => (
            <button
              key={dm.key}
              onClick={() => setDisplayMode(dm.key)}
              className="py-2.5 px-4 rounded-xl text-sm font-medium text-left border cursor-pointer"
              style={{
                backgroundColor: displayMode === dm.key ? "var(--color-primary-soft)" : "var(--color-surface)",
                color: displayMode === dm.key ? "var(--color-primary)" : "var(--color-text)",
                borderColor: displayMode === dm.key ? "var(--color-primary)" : "var(--color-divider)",
              }}
            >
              {dm.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          TTS 설정
        </h2>
        <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}>
          <div className="flex items-center justify-between">
            <label className="text-sm" style={{ color: "var(--color-text)" }}>
              읽기 속도
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={ttsRate}
                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs w-8 text-right" style={{ color: "var(--color-text-muted)" }}>
                {ttsRate}x
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm" style={{ color: "var(--color-text)" }}>
              단어 간격
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={ttsGap}
                onChange={(e) => setTtsGap(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-xs w-10 text-right" style={{ color: "var(--color-text-muted)" }}>
                {ttsGap}초
              </span>
            </div>
          </div>
        </div>
      </section>

      {canInstall && (
        <button
          onClick={install}
          className="w-full py-3 rounded-xl font-medium border-none cursor-pointer text-sm"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          앱 설치하기
        </button>
      )}

      <Link
        to="/about"
        className="block w-full py-3 rounded-xl font-medium text-center no-underline text-sm"
        style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-divider)" }}
      >
        About ChinVoca
      </Link>
    </div>
  );
}
