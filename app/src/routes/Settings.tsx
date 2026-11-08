import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { clear as idbClear } from "idb-keyval";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  HardDrive,
  Loader2,
  Mountain,
  ScrollText,
  Sprout,
  Trash2,
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
  type BlueLightLevel,
} from "@/state/settings";
import type { VoiceMode } from "@/lib/tts";
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
  clearTtsCache,
  getCachedTtsFileSet,
  getStorageInfo,
  type StorageInfo,
} from "@/lib/storage";
import type { LearnMode } from "@/lib/learningListening";
import { useFlashcards, type FlashcardDirection } from "@/state/flashcards";
import { exportBackup, importBackup, type ChinWordBackup } from "@/lib/backup";
import {
  bulkDownloadTier,
  getTtsTierMetas,
  tierFiles,
  type BulkProgress,
  type TtsTier,
  type TtsTierMeta,
} from "@/lib/ttsBulkDownload";
import type { TtsTierState } from "@/state/settings";

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
    <div className="card flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted mt-0.5">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </div>
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
  { value: "sepia", label: "세피아" },
  { value: "warm", label: "웜다크" },
  { value: "system", label: "시스템" },
];

const BLUE_LIGHT_OPTIONS: { value: BlueLightLevel; label: string }[] = [
  { value: 0, label: "끔" },
  { value: 1, label: "약" },
  { value: 2, label: "중" },
  { value: 3, label: "강" },
];

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
      className="inline-flex items-center gap-1 rounded-full bg-divider/50 p-1"
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
              "px-3 py-1 text-sm rounded-full whitespace-nowrap transition " +
              (selected
                ? "bg-primary text-white font-medium shadow-sm"
                : "text-muted")
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
  const fcAutoplay = useFlashcards((f) => f.autoplay);
  const setFcAutoplay = useFlashcards((f) => f.setAutoplay);
  const fcDirection = useFlashcards((f) => f.direction);
  const setFcDirection = useFlashcards((f) => f.setDirection);
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

        {/* 화면 테마 — 5종을 한 줄 세그먼트로(SMCB 동일 유형). flex-1 로 균등
            분배해 좁은 화면에서도 가로 오버플로 없이 들어간다. */}
        <div className="card">
          <div className="font-medium">테마</div>
          <div className="text-xs text-muted mt-0.5">
            라이트는 흰 배경, 다크는 검은 배경, 세피아는 따뜻한 종이색, 웜다크는
            포근한 어두운 색, 시스템은 단말기 설정을 따라요.
          </div>
          <div
            className="mt-3 flex items-center gap-1 rounded-full bg-divider/50 p-1"
            role="group"
            aria-label="화면 테마"
          >
            {THEME_OPTIONS.map((o) => {
              const selected = s.themeMode === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    s.setThemeMode(o.value);
                    applySettingsToDom();
                  }}
                  className={
                    "flex-1 rounded-full px-2 py-1.5 text-sm text-center whitespace-nowrap transition " +
                    (selected
                      ? "bg-primary text-white font-medium shadow-sm"
                      : "text-muted")
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 청색광 차단 — 테마와 독립. 끔/약/중/강 4단계 세그먼트. 켜면 화면
            전체에 따뜻한 앰버 톤을 덧씌워 청색 성분을 줄인다. */}
        <div className="card">
          <div className="font-medium">청색광 차단</div>
          <div className="text-xs text-muted mt-0.5">
            화면 전체에 따뜻한 색을 덧입혀 파란빛을 줄여요. 밤이나 오래 볼 때
            강하게. 모든 테마에 적용돼요.
          </div>
          <div
            className="mt-3 flex items-center gap-1 rounded-full bg-divider/50 p-1"
            role="group"
            aria-label="청색광 차단 강도"
          >
            {BLUE_LIGHT_OPTIONS.map((o) => {
              const selected = s.blueLight === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    s.setBlueLight(o.value);
                    applySettingsToDom();
                  }}
                  className={
                    "flex-1 rounded-full px-2 py-1.5 text-sm text-center whitespace-nowrap transition " +
                    (selected
                      ? "bg-primary text-white font-medium shadow-sm"
                      : "text-muted")
                  }
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

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

        <Row
          label="재생 방식"
          hint="녹음 음성은 음질이 일정하고 오프라인에 강해요. 기기 음성은 데이터·용량을 아낍니다."
        >
          <SegmentedButtons<VoiceMode>
            value={s.voiceMode}
            options={[
              { value: "recorded", label: "녹음 음성" },
              { value: "device", label: "기기 음성" },
            ]}
            onChange={(v) => s.setVoiceMode(v)}
          />
        </Row>

        <Row
          label="플래시카드 문제 방향(기본)"
          hint="한자→뜻: 한자 보고 뜻 맞히기 · 뜻→한자: 뜻 보고 한자 떠올리기 · 혼합: 둘을 섞어서 출제."
        >
          <SegmentedButtons<FlashcardDirection>
            value={fcDirection}
            options={[
              { value: "hanzi-first", label: "한자→뜻" },
              { value: "meaning-first", label: "뜻→한자" },
              { value: "mixed", label: "혼합" },
            ]}
            onChange={setFcDirection}
          />
        </Row>

        <Row
          label="답 보기 때 음성"
          hint="한자→뜻 방향에서 '답 보기'를 누르면 음성을 한 번 더 들려줘요. 자동 음성 재생이 켜져 있을 때 적용돼요."
        >
          <SegmentedButtons<"on" | "off">
            value={s.revealSpeak ? "on" : "off"}
            options={[
              { value: "on", label: "켜짐" },
              { value: "off", label: "꺼짐" },
            ]}
            onChange={(v) => s.setRevealSpeak(v === "on")}
          />
        </Row>

        <Row
          label="학습 듣기 방식(기본)"
          hint="맞춤: 묶음·따라 말하기·회상 · 전체 5바퀴: 간격을 두어 반복 · 단어별 5회: 한 단어를 연달아 5회."
        >
          <SegmentedButtons<LearnMode>
            value={s.learnMode}
            options={[
              { value: "custom", label: "맞춤" },
              { value: "round", label: "5바퀴" },
              { value: "word", label: "단어별" },
            ]}
            onChange={(v) => s.setLearnMode(v)}
          />
        </Row>

        <Row label="맞춤: 묶음 크기" hint="한 번에 외울 단어 수예요. 5개 안팎이 기억에 효과적이에요.">
          <SegmentedButtons<"3" | "5" | "7" | "10">
            value={String(s.chunkSize) as "3" | "5" | "7" | "10"}
            options={[
              { value: "3", label: "3개" },
              { value: "5", label: "5개" },
              { value: "7", label: "7개" },
              { value: "10", label: "10개" },
            ]}
            onChange={(v) => s.setChunkSize(Number(v))}
          />
        </Row>

        <Row label="맞춤: 따라 말하기 공백" hint="음성 뒤에 따라 말할 시간을 둬요.">
          <SegmentedButtons<"on" | "off">
            value={s.shadowGap ? "on" : "off"}
            options={[
              { value: "on", label: "켜짐" },
              { value: "off", label: "꺼짐" },
            ]}
            onChange={(v) => s.setShadowGap(v === "on")}
          />
        </Row>

        <Row label="맞춤: 느리게 시작" hint="첫 회차는 느린 속도로 들려주고 이후 보통 속도로 들려줘요.">
          <SegmentedButtons<"on" | "off">
            value={s.slowStart ? "on" : "off"}
            options={[
              { value: "on", label: "켜짐" },
              { value: "off", label: "꺼짐" },
            ]}
            onChange={(v) => s.setSlowStart(v === "on")}
          />
        </Row>

        <Row
          label="자동 음성 재생"
          hint="플래시카드에서 카드가 바뀌면 자동으로 중국어 음성이 한 번 재생돼요. 도서관 등 조용한 곳에서는 꺼 두세요."
        >
          <SegmentedButtons<"on" | "off">
            value={fcAutoplay ? "on" : "off"}
            options={[
              { value: "on", label: "켜짐" },
              { value: "off", label: "꺼짐" },
            ]}
            onChange={(v) => setFcAutoplay(v === "on")}
          />
        </Row>

        {s.voiceMode === "recorded" ? <TtsBulkCard onToast={setToast} /> : null}

        <VoiceDiagnostic rate={s.ttsRate} voiceMode={s.voiceMode} />

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

/**
 * "중국어 음성 미리 받기" 카드 — 사전녹음 mp3 를 SW 캐시에 워밍한다.
 * 녹음 음성 모드일 때만 노출(기기 음성 모드는 mp3 를 쓰지 않으므로 무의미).
 *
 * 급수별 분할: 전체 ≈117MB 를 한 번에 받지 않고 기초/중급/고급/성어 단위로 나눠
 * 받는다. 각 급수의 진행/상태는 settings 스토어(ttsBulkTiers)에 급수별로 보존해
 * 세션 간 상태(완료/일부 실패)를 기억한다. 한 번에 한 급수만 받는다(회선 보호).
 */
// 급수 아이콘 — BottomNav 와 같은 lucide 단색 아이콘 체계(currentColor)로 통일.
const TIER_ICON: Record<TtsTier, typeof Sprout> = {
  basic: Sprout,
  mid: Building2,
  adv: Mountain,
  idioms: ScrollText,
};

const BULK_BADGE: Record<string, { label: string; cls: string }> = {
  idle: { label: "시작 전", cls: "bg-divider text-muted" },
  downloading: { label: "받는 중", cls: "bg-primary text-white" },
  done: { label: "완료", cls: "bg-success text-white" },
  partial: { label: "일부 실패", cls: "bg-accent text-white" },
  skipped: { label: "중지됨", cls: "bg-divider text-muted" },
};

function TtsBulkCard({ onToast }: { onToast: (m: string) => void }) {
  const metas = getTtsTierMetas();
  const tiers = useSettings((st) => st.ttsBulkTiers);
  const setTier = useSettings((st) => st.setTtsBulkTier);

  const [runningTier, setRunningTier] = useState<TtsTier | null>(null);
  const [live, setLive] = useState<BulkProgress | null>(null);
  const [removing, setRemoving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // 진입 시 영속 "완료/일부" 상태를 실제 tts 캐시와 대조해 거짓 완료를 바로잡는다.
  // (브라우저 용량 압박으로 Cache Storage 가 앱과 무관하게 비워질 수 있음)
  // 한 번만 검증; 다운로드 진행 중에는 건너뛴다.
  const verifiedRef = useRef(false);
  useEffect(() => {
    if (verifiedRef.current) return;
    // 검증 대상이 없으면(모두 idle) 캐시를 열지 않는다.
    const needsCheck = metas.some((m) => {
      const t = tiers[m.tier];
      return t && (t.status === "done" || t.status === "partial");
    });
    if (!needsCheck) return;
    verifiedRef.current = true;
    let cancelled = false;
    void (async () => {
      const cached = await getCachedTtsFileSet();
      if (cancelled) return;
      // 캐시 자체가 비어 있고 무언가 완료로 표시돼 있으면 전부 초기화.
      for (const m of metas) {
        const st = tiers[m.tier];
        if (!st || (st.status !== "done" && st.status !== "partial")) continue;
        const files = tierFiles(m.tier);
        if (files.length === 0) continue;
        let have = 0;
        for (const f of files) if (cached.has(f)) have++;
        const coverage = have / files.length;
        // 거의 그대로면(≥98%) 유지. 일부 남았으면 partial, 거의 없으면 idle.
        if (coverage >= 0.98) continue;
        if (have === 0) {
          setTier(m.tier, { status: "idle", done: 0, total: 0 });
        } else {
          setTier(m.tier, {
            status: "partial",
            done: have,
            total: files.length,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start(meta: TtsTierMeta) {
    if (runningTier) return; // 한 번에 한 급수만
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunningTier(meta.tier);
    setLive({ done: 0, failed: 0, total: meta.fileCount });
    setTier(meta.tier, {
      status: "downloading",
      done: 0,
      total: meta.fileCount,
    });
    // idb 쓰기 폭증 방지 — 64개마다 + 완료 시점에만 스토어에 persist.
    let lastPersist = 0;
    const result = await bulkDownloadTier(meta.tier, {
      signal: ac.signal,
      onProgress: (p) => {
        setLive(p);
        if (p.done - lastPersist >= 64) {
          lastPersist = p.done;
          setTier(meta.tier, { done: p.done, total: p.total });
        }
      },
    });
    setRunningTier(null);
    setLive(null);
    const status = result.aborted
      ? "skipped"
      : result.failed === 0
        ? "done"
        : "partial";
    setTier(meta.tier, { status, done: result.done, total: result.total });
  }

  async function removeAll() {
    if (
      !confirm(
        "받아둔 중국어 음성을 모두 삭제할까요?\n오프라인 재생이 불가해지며, 들을 때 다시 받습니다.",
      )
    )
      return;
    setRemoving(true);
    try {
      await clearTtsCache();
      for (const m of metas) {
        setTier(m.tier, { status: "idle", done: 0, total: 0 });
      }
      onToast("받아둔 음성을 삭제했습니다");
    } finally {
      setRemoving(false);
    }
  }

  const anyDownloaded = metas.some((m) => {
    const t = tiers[m.tier];
    return t && (t.status === "done" || t.status === "partial");
  });

  return (
    <div className="card space-y-3">
      <div className="font-medium inline-flex items-center gap-1.5">
        <Download size={16} aria-hidden /> 중국어 음성 미리 받기
      </div>
      <p className="text-sm text-muted">
        급수별로 나눠 받을 수 있어요. 한 번 받아두면 인터넷 없이도 음성이
        재생됩니다.
      </p>

      <div className="space-y-2">
        {metas.map((meta) => (
          <TierRow
            key={meta.tier}
            meta={meta}
            state={tiers[meta.tier]}
            running={runningTier === meta.tier}
            live={runningTier === meta.tier ? live : null}
            disabled={runningTier !== null && runningTier !== meta.tier}
            onStart={() => void start(meta)}
            onStop={() => abortRef.current?.abort()}
          />
        ))}
      </div>

      {anyDownloaded && !runningTier ? (
        <button
          type="button"
          onClick={() => void removeAll()}
          disabled={removing}
          className="btn-ghost text-sm border border-divider inline-flex items-center gap-1.5 disabled:opacity-50"
          aria-label="받아둔 중국어 음성 모두 삭제"
        >
          <Trash2 size={14} aria-hidden /> {removing ? "삭제 중…" : "받은 음성 모두 삭제"}
        </button>
      ) : null}
    </div>
  );
}

/** 급수 한 줄 — 라벨·용량·상태 배지·진행 바·받기/중지 버튼. */
function TierRow({
  meta,
  state,
  running,
  live,
  disabled,
  onStart,
  onStop,
}: {
  meta: TtsTierMeta;
  state: TtsTierState | undefined;
  running: boolean;
  live: BulkProgress | null;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const status = running ? "downloading" : state?.status ?? "idle";
  const total = (running && live ? live.total : state?.total) || meta.fileCount;
  const done = running && live ? live.done : state?.done ?? 0;
  const failed = running && live ? live.failed : 0;
  const pct = total ? Math.floor((done / total) * 100) : 0;
  const badge = BULK_BADGE[status];
  const showBar = running || done > 0;
  const Icon = TIER_ICON[meta.tier];

  return (
    <div className="rounded-btn border border-divider p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm inline-flex items-center gap-1.5">
            <Icon size={15} aria-hidden className="text-primary shrink-0" />
            {meta.label}
          </div>
          <div className="text-xs text-muted">
            약 {meta.estMB}MB · {meta.fileCount.toLocaleString()}개
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge ? (
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-semibold " + badge.cls
              }
            >
              {badge.label}
            </span>
          ) : null}
          {running ? (
            <button
              type="button"
              onClick={onStop}
              className="btn-ghost text-xs border border-divider"
            >
              중지
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={disabled}
              className="btn-ghost text-xs border border-primary text-primary inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Download size={13} aria-hidden />
              {status === "done"
                ? "다시"
                : status === "partial"
                  ? "재시도"
                  : "받기"}
            </button>
          )}
        </div>
      </div>

      {showBar ? (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className="h-1.5 w-full rounded-full bg-divider overflow-hidden"
          >
            <div
              className={
                "h-full transition-[width] duration-300 " +
                (status === "done" ? "bg-success" : "bg-primary")
              }
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted inline-flex items-center gap-1.5">
            {running ? (
              <>
                <Loader2 size={13} aria-hidden className="animate-spin" />
                {done.toLocaleString()}/{total.toLocaleString()}
                {failed > 0 ? ` (실패 ${failed})` : ""}
              </>
            ) : status === "done" ? (
              <>
                <CheckCircle2 size={13} aria-hidden className="text-success" />
                완료 {done.toLocaleString()}/{total.toLocaleString()}
              </>
            ) : (
              <>
                {done.toLocaleString()}/{total.toLocaleString()}
                {status === "partial" ? " · 일부 실패 (재시도 가능)" : ""}
              </>
            )}
          </p>
        </>
      ) : null}
    </div>
  );
}

function VoiceDiagnostic({
  rate,
  voiceMode,
}: {
  rate: number;
  voiceMode: VoiceMode;
}) {
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
    // voiceMode 변경 시에도 현재 음성 라벨을 다시 계산.
  }, [voiceMode]);

  if (!isTtsAvailable()) {
    return (
      <Row label="음성 진단" hint="이 브라우저는 음성 합성을 지원하지 않습니다">
        <span className="text-xs text-muted">미지원</span>
      </Row>
    );
  }

  // 녹음 모드는 mp3 우선이라 기기 음성팩 유무와 무관하게 음질이 일정하다.
  const status =
    voiceMode === "recorded"
      ? "사전녹음 음성 (Microsoft Edge Neural)"
      : hasZh
        ? voiceName ?? "(이름 없음)"
        : "(중국어 음성 없음 — OS 기본 음성으로 zh-CN 시도)";
  const statusOk = voiceMode === "recorded" || hasZh;

  const zhVoices = voices.filter((v) => /^(zh|cmn)/i.test(v.lang));

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium inline-flex items-center gap-1.5">
            <Volume2 size={14} aria-hidden /> 음성 진단
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">
            현재: <span className={statusOk ? "text-fg" : "text-amber-500"}>{status}</span>
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
