import { Link } from "react-router-dom";
import { clear as idbClear } from "idb-keyval";
import { ChevronRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import {
  applySettingsToDom,
  useSettings,
  type FontScale,
  type ThemeMode,
  type DisplayMode,
} from "@/state/settings";

function Row({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card flex items-center justify-between gap-3">
      <div>
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted mt-0.5">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SegmentedButtons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-btn border border-divider overflow-hidden">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={
            "px-3 py-1 text-sm " +
            (o.value === value ? "bg-primary text-white" : "bg-surface text-fg")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const s = useSettings();

  async function clearCacheStorage() {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    alert("캐시 정리 완료");
  }

  async function fullReset() {
    if (!confirm("학습 기록을 포함한 모든 데이터를 삭제할까요?")) return;
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await idbClear();
    location.reload();
  }

  return (
    <PageShell>
      <TopBar title="설정" />
      <div className="space-y-3 mt-2">
        <Row label="글자 크기">
          <SegmentedButtons<FontScale>
            value={s.fontScale}
            options={[
              { value: "sm", label: "작게" },
              { value: "md", label: "보통" },
              { value: "lg", label: "크게" },
              { value: "xl", label: "매우" },
            ]}
            onChange={(v) => {
              s.setFontScale(v);
              applySettingsToDom();
            }}
          />
        </Row>

        <Row label="다크 모드">
          <SegmentedButtons<ThemeMode>
            value={s.themeMode}
            options={[
              { value: "system", label: "시스템" },
              { value: "light", label: "라이트" },
              { value: "dark", label: "다크" },
            ]}
            onChange={(v) => {
              s.setThemeMode(v);
              applySettingsToDom();
            }}
          />
        </Row>

        <Row label="표시 모드">
          <SegmentedButtons<DisplayMode>
            value={s.displayMode}
            options={[
              { value: "all", label: "전체" },
              { value: "hanzi-pinyin", label: "한자+병음" },
              { value: "hanzi-only", label: "한자만" },
            ]}
            onChange={(v) => s.setDisplayMode(v)}
          />
        </Row>

        <Row label="TTS 속도" hint={`${s.ttsRate.toFixed(2)}×`}>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={s.ttsRate}
            onChange={(e) => s.setTtsRate(Number(e.target.value))}
            className="w-40"
          />
        </Row>

        <Row label="이어듣기 간격" hint={`${(s.ttsGapMs / 1000).toFixed(1)}초`}>
          <input
            type="range"
            min={500}
            max={3000}
            step={100}
            value={s.ttsGapMs}
            onChange={(e) => s.setTtsGapMs(Number(e.target.value))}
            className="w-40"
          />
        </Row>

        <Row label="캐시 정리" hint="앱 셸/콘텐츠 캐시 비움 (학습 기록 보존)">
          <button type="button" className="btn-ghost text-sm border border-divider" onClick={clearCacheStorage}>
            정리
          </button>
        </Row>

        <Row label="전체 초기화" hint="설정 + 즐겨찾기 + SRS 카드 + 캐시 모두 삭제">
          <button type="button" className="btn-ghost text-sm border border-primary text-primary" onClick={fullReset}>
            초기화
          </button>
        </Row>

        <Link to="/about" className="card flex items-center justify-between">
          <div>
            <div className="font-medium">정보</div>
            <div className="text-xs text-muted mt-0.5">버전 · 라이선스 · 콘텐츠 안내</div>
          </div>
          <ChevronRight size={18} aria-hidden className="text-muted" />
        </Link>
      </div>
    </PageShell>
  );
}
