import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { clear as idbClear } from "idb-keyval";
import {
  ChevronRight,
  Download,
  HardDrive,
  Upload,
  Volume2,
} from "lucide-react";
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
import {
  clearAllCaches,
  clearContentCaches,
  getStorageInfo,
  type StorageInfo,
} from "@/lib/storage";
import { exportBackup, importBackup, type ChinWordBackup } from "@/lib/backup";

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
  // 모달 alert() 대신 비차단적 토스트. 캐시 정리 후 사용자가 흐름을 잃지 않도록
  // 페이지 하단에 잠깐 떴다 사라지는 알림으로 결과만 전달. aria-live=polite 로
  // 스크린리더에도 변경을 알린다.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function fullReset() {
    if (!confirm("학습 기록을 포함한 모든 데이터를 삭제할까요?")) return;
    await clearAllCaches();
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

        <StoragePanel onToast={setToast} />

        <BackupPanel onToast={setToast} />

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

      {/* Toast — 비차단적 결과 알림 (캐시 정리 등). 2.2s 후 자동 dismiss. */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 px-4 py-2 rounded-full bg-fg text-bg text-sm shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </PageShell>
  );
}

/**
 * 저장 공간 패널 — 사용량/할당량 막대 + 콘텐츠 캐시 비우기.
 *
 * "콘텐츠 캐시 비우기"는 다시 받을 수 있는 tts mp3·필순 데이터만 삭제하고
 * 앱 셸은 보존하므로 오프라인 동작이 깨지지 않는다. 학습 기록도 그대로다.
 */
function StoragePanel({ onToast }: { onToast: (m: string) => void }) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    void getStorageInfo().then(setInfo);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function clearContent() {
    setBusy(true);
    try {
      const n = await clearContentCaches();
      onToast(
        n > 0 ? "콘텐츠 캐시를 비웠습니다" : "비울 콘텐츠 캐시가 없습니다",
      );
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium inline-flex items-center gap-1.5">
            <HardDrive size={14} aria-hidden /> 저장 공간
          </div>
          <div className="text-xs text-muted mt-0.5">
            {info?.supported
              ? `${info.usageMB} MB / ${info.quotaMB} MB 사용 (${info.percent}%)`
              : "이 브라우저는 사용량 정보를 제공하지 않습니다"}
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost text-sm border border-divider disabled:opacity-50"
          onClick={clearContent}
          disabled={busy}
        >
          캐시 비우기
        </button>
      </div>
      {info?.supported && info.quotaBytes > 0 ? (
        <div
          className="h-2 w-full rounded-full bg-divider overflow-hidden"
          role="progressbar"
          aria-valuenow={info.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, info.percent)}%` }}
          />
        </div>
      ) : null}
      <div className="text-xs text-muted">
        발음·필순 데이터만 비우며 학습 기록과 앱 화면은 보존됩니다. 온라인이면
        다시 받습니다.
      </div>
    </div>
  );
}

/**
 * 백업/복원 패널 — 학습 기록을 JSON 파일로 내보내고, 새 기기에서 가져온다.
 *
 * iOS Safari 7일 미사용 자동 정리·재설치·기기 변경 시 학습 진도를 잃지 않도록
 * 사용자가 직접 파일로 보관할 수 있게 한다. 복원 후에는 스토어 재하이드레이트를
 * 위해 페이지를 새로고침한다.
 */
function BackupPanel({ onToast }: { onToast: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const backup = await exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chinword-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast("백업 파일을 저장했습니다");
    } catch {
      onToast("백업에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file) return;
    if (
      !confirm(
        "백업을 복원하면 같은 항목은 덮어쓰입니다. 계속할까요?\n복원 후 앱이 새로고침됩니다.",
      )
    )
      return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ChinWordBackup;
      const n = await importBackup(parsed);
      onToast(`${n}개 항목을 복원했습니다 — 새로고침합니다`);
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      onToast(
        err instanceof Error && err.message.includes("백업 파일")
          ? "ChinWord 백업 파일이 아닙니다"
          : "복원에 실패했습니다 (파일 손상?)",
      );
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-2">
      <div className="font-medium">학습 기록 백업</div>
      <div className="text-xs text-muted">
        설정·즐겨찾기·플래시카드(SRS)·이어듣기 진도를 파일로 저장하고 새 기기나
        재설치 후 복원합니다.
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn-ghost text-sm border border-divider inline-flex items-center gap-1.5 disabled:opacity-50"
          onClick={doExport}
          disabled={busy}
        >
          <Download size={14} aria-hidden /> 백업 저장
        </button>
        <button
          type="button"
          className="btn-ghost text-sm border border-divider inline-flex items-center gap-1.5 disabled:opacity-50"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Upload size={14} aria-hidden /> 복원
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
        />
      </div>
    </div>
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
