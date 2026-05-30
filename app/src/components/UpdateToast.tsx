import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useUpdateStore, type UpdatePhase } from "@/state/useUpdateStore";
import { isInAppBrowser } from "@/lib/inapp";

function ProgressBar({ pct }: { pct: number }): JSX.Element {
  return (
    <div className="w-full h-1.5 rounded-full bg-divider/40 overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const PHASE_UI: Record<
  UpdatePhase,
  { label: string; icon: JSX.Element | null }
> = {
  idle: { label: "", icon: null },
  downloading: {
    label: "오프라인 데이터 다운로드 중…",
    icon: <Loader2 size={14} className="animate-spin text-primary" aria-hidden />,
  },
  installing: { label: "설치 완료", icon: null },
  error: {
    label: "설치 실패",
    icon: <AlertTriangle size={14} className="text-accent" aria-hidden />,
  },
};

/**
 * SW precache 진행/실패 토스트.
 *   - 첫 설치: downloading → installing(100%) → 2초 후 자동 닫힘.
 *   - 업데이트 감지: 표시 안 함 (B 방식 — 다음 실행 시 자동 적용).
 *   - 실패: 다시 시도 / 닫기.
 * 인앱 브라우저(카카오톡 등)에서는 SW 가 비정상 동작하므로 숨긴다.
 */
export function UpdateToast(): JSX.Element | null {
  const ui = useUpdateStore((s) => s.ui);
  const retrySW = useUpdateStore((s) => s.retrySW);
  const dismiss = useUpdateStore((s) => s.dismiss);

  if (isInAppBrowser().kind) return null;
  if (ui.phase === "idle") return null;

  const info = PHASE_UI[ui.phase];
  const isInProgress = ui.phase === "downloading" || ui.phase === "installing";
  const isError = ui.phase === "error";

  return (
    <div
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={
          "pointer-events-auto rounded-card bg-surface shadow-card border px-4 py-3 max-w-sm min-w-[200px] " +
          (isError ? "border-accent space-y-3" : "border-primary space-y-2")
        }
      >
        <div className="flex items-center gap-2">
          {info.icon}
          <span className="text-sm text-fg font-medium flex-1">
            {info.label}
          </span>
          {isInProgress && ui.pct < 100 && (
            <span className="text-xs text-muted tabular-nums font-semibold">
              {ui.pct}%
            </span>
          )}
        </div>

        {ui.pct > 0 && ui.pct < 100 && <ProgressBar pct={ui.pct} />}

        {isError && (
          <>
            <p className="text-xs text-muted leading-relaxed">
              네트워크 문제로 오프라인 데이터를 받지 못했어요. 잠시 후 다시
              시도해 주세요.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => retrySW?.()}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-white text-xs font-bold px-4 py-1.5 flex-1"
              >
                <RefreshCw size={12} aria-hidden />
                다시 시도
              </button>
              <button
                type="button"
                onClick={() => dismiss()}
                className="rounded-full border border-divider text-muted text-xs font-bold px-4 py-1.5"
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
