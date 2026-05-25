import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { clear as idbClear } from "idb-keyval";
import { ChevronRight, Volume2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import {
  applySettingsToDom,
  useSettings,
  type FontScale,
  type ThemeMode,
  type DisplayMode,
} from "@/state/settings";
import {
  currentVoiceName,
  hasChineseVoice,
  isTtsAvailable,
  listVoices,
  speak,
} from "@/lib/tts";

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
    <div
      className="inline-flex rounded-btn border border-divider overflow-hidden"
      role="group"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className={
              "px-3 py-1 text-sm " +
              (selected ? "bg-primary text-white" : "bg-surface text-fg")
            }
          >
            {o.label}
          </button>
        );
      })}
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

        <VoiceDiagnostic rate={s.ttsRate} />

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

        <Link to="/about" className="card flex items-center justify-between" aria-label="정보 페이지">
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

function VoiceDiagnostic({ rate }: { rate: number }) {
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [hasZh, setHasZh] = useState(false);
  const [voices, setVoices] = useState<{ name: string; lang: string; default: boolean }[]>([]);
  const [expanded, setExpanded] = useState(false);

  function refresh() {
    setVoiceName(currentVoiceName());
    setHasZh(hasChineseVoice());
    setVoices(listVoices());
  }

  useEffect(() => {
    refresh();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const onChange = () => refresh();
      window.speechSynthesis.addEventListener("voiceschanged", onChange);
      // Some engines need a small delay before voices appear
      const t = window.setTimeout(refresh, 300);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onChange);
        window.clearTimeout(t);
      };
    }
  }, []);

  if (!isTtsAvailable()) {
    return (
      <Row label="음성 진단" hint="이 브라우저는 음성 합성을 지원하지 않습니다">
        <span className="text-xs text-muted">미지원</span>
      </Row>
    );
  }

  const status = hasZh
    ? voiceName ?? "(이름 없음)"
    : "(중국어 음성 없음 — OS 기본 음성으로 zh-CN 시도)";

  const zhVoices = voices.filter((v) => /^(zh|cmn)/i.test(v.lang));

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium inline-flex items-center gap-1.5">
            <Volume2 size={14} aria-hidden /> 음성 진단
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">
            현재: <span className={hasZh ? "text-fg" : "text-amber-500"}>{status}</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost text-sm border border-divider"
          onClick={() => speak("你好", { rate })}
        >
          발음 테스트
        </button>
      </div>
      {voices.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted underline"
        >
          전체 음성 {voices.length}개 ({zhVoices.length}개 zh) {expanded ? "접기" : "보기"}
        </button>
      ) : (
        <div className="text-xs text-muted">
          음성 목록을 로드 중입니다… 잠시 후 다시 열어 주세요.
        </div>
      )}
      {expanded && voices.length > 0 ? (
        <ul className="text-xs text-muted space-y-0.5 max-h-48 overflow-y-auto border-t border-divider pt-2">
          {voices.map((v) => (
            <li
              key={`${v.name}|${v.lang}`}
              className={/^(zh|cmn)/i.test(v.lang) ? "text-fg" : ""}
            >
              · {v.name} <span className="opacity-60">[{v.lang}]</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
