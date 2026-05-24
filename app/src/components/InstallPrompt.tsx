import { useEffect, useState } from "react";
import { useSettings } from "@/state/settings";

type BeforeInstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const RE_PROMPT_DAYS = 7;

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const dismissedAt = useSettings((s) => s.installPromptDismissedAt);
  const dismiss = useSettings((s) => s.dismissInstallPrompt);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      (window.navigator.standalone as boolean | undefined) === true;
    if (standalone) return;

    const recentlyDismissed =
      dismissedAt && Date.now() - dismissedAt < RE_PROMPT_DAYS * 86400_000;
    if (recentlyDismissed) return;

    const isiOSDevice = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIos(isiOSDevice);

    if (isiOSDevice) {
      setShow(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [dismissedAt]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-screen-sm px-4"
    >
      <div className="card flex items-start gap-3 shadow-xl">
        <div className="text-2xl" aria-hidden>📲</div>
        <div className="flex-1 text-sm">
          <div className="font-semibold mb-1">홈 화면에 설치하기</div>
          {isIos ? (
            <p className="text-muted">
              Safari 하단의 <b>공유</b> 메뉴 → <b>홈 화면에 추가</b>를 눌러 설치할 수
              있습니다.
            </p>
          ) : (
            <p className="text-muted">앱처럼 빠르게 실행하려면 설치하세요.</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {!isIos && deferred ? (
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice.catch(() => undefined);
                setShow(false);
              }}
            >
              설치
            </button>
          ) : null}
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              dismiss();
              setShow(false);
            }}
          >
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}
