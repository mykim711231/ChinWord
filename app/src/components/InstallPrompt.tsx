import { useEffect, useState } from "react";
import {
  Share,
  Plus,
  X,
  Download,
  Lightbulb,
  Monitor,
  Smartphone,
} from "lucide-react";
import AppleLogo from "@/components/AppleLogo";
import AndroidLogo from "@/components/AndroidLogo";
import { useSettings } from "@/state/settings";

type BeforeInstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type OS = "android" | "ios" | "windows" | "mac" | "other";

const RE_PROMPT_DAYS = 7;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari 전용 플래그
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  )
    return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  return "other";
}

function isIOSSafari(): boolean {
  if (detectOS() !== "ios") return false;
  const ua = navigator.userAgent;
  // Chrome(CriOS)·Firefox(FxiOS)·Edge(EdgiOS)·Opera(OPiOS) on iOS 제외
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

function isMacSafari(): boolean {
  if (detectOS() !== "mac") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
}

function isSamsungInternet(): boolean {
  if (typeof navigator === "undefined") return false;
  return /SamsungBrowser/i.test(navigator.userAgent);
}

/**
 * 홈 화면 설치 안내 배너 — 하단 플로팅.
 *
 * OS 별로 설치 경로가 달라 라벨·동작을 분기한다:
 *  - Chromium(안드로이드·윈도·맥·리눅스): beforeinstallprompt 의 deferredPrompt 호출
 *  - iOS Safari: 자동 프롬프트 없음 → 공유 메뉴 3단계 모달
 *  - macOS Safari 17+: 파일 → "Dock에 추가" 모달
 *  - 삼성 인터넷: + 아이콘 / ⋮ 메뉴 수동 가이드 모달
 * 설치 경로가 전혀 없는 브라우저(other)에서는 배너 자체를 숨긴다.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [os, setOs] = useState<OS>("other");
  const [iosModal, setIosModal] = useState(false);
  const [macModal, setMacModal] = useState(false);
  const [samsungModal, setSamsungModal] = useState(false);
  const dismissedAt = useSettings((s) => s.installPromptDismissedAt);
  const dismiss = useSettings((s) => s.dismissInstallPrompt);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOs(detectOS());
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onBeforeInstall = (e: Event): void => {
      e.preventDefault();
      setDeferred(e as BeforeInstallEvent);
    };
    const onInstalled = (): void => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const recentlyDismissed =
    dismissedAt && Date.now() - dismissedAt < RE_PROMPT_DAYS * 86400_000;
  if (recentlyDismissed) return null;

  const promptAvailable = deferred !== null;
  const iosAvailable = isIOSSafari();
  const macSafari = isMacSafari();
  const samsungAvailable = isSamsungInternet();

  // 설치 경로가 하나라도 있어야 배너를 띄운다 (불필요한 노출 방지).
  const canInstall =
    promptAvailable ||
    (os === "ios" && iosAvailable) ||
    (os === "mac" && macSafari) ||
    samsungAvailable;
  if (!canInstall) return null;

  // OS별 1차 버튼 라벨/아이콘. deferredPrompt 는 공통이지만 라벨은 OS에 맞춤.
  const primary: { label: string; icon: JSX.Element } =
    os === "ios"
      ? { label: "iPhone에 설치", icon: <AppleLogo size={14} /> }
      : os === "android"
      ? { label: "Android에 설치", icon: <AndroidLogo size={16} /> }
      : os === "windows"
      ? { label: "Windows에 설치", icon: <Monitor size={16} /> }
      : os === "mac"
      ? { label: "Mac에 설치", icon: <AppleLogo size={14} /> }
      : { label: "이 기기에 설치", icon: <Download size={16} /> };

  const handlePromptInstall = async (): Promise<void> => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => ({
      outcome: "dismissed" as const,
    }));
    if (choice.outcome === "accepted") {
      setDeferred(null);
      setInstalled(true);
    }
  };

  const onPrimaryClick = (): void => {
    if (os === "ios" && !promptAvailable) {
      setIosModal(true);
      return;
    }
    if (os === "mac" && macSafari && !promptAvailable) {
      setMacModal(true);
      return;
    }
    if (samsungAvailable && !promptAvailable) {
      setSamsungModal(true);
      return;
    }
    void handlePromptInstall();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="false"
        aria-label="홈 화면에 설치"
        className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-screen-sm px-4"
      >
        <div className="card flex items-start gap-3 shadow-xl">
          <div className="text-primary flex-none mt-0.5" aria-hidden>
            <Smartphone size={22} />
          </div>
          <div className="flex-1 text-sm min-w-0">
            <div className="font-semibold mb-0.5">앱으로 설치하기</div>
            <p className="text-muted">
              한 번 설치하면 인터넷 없이도 사용할 수 있어요.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPrimaryClick}
                className="btn-primary text-sm inline-flex items-center gap-1.5"
              >
                {primary.icon}
                {primary.label}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm border border-divider"
                onClick={dismiss}
              >
                다시 보지 않기
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="text-muted hover:text-fg p-1 flex-none"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>
      {iosModal && <IOSInstallModal onClose={() => setIosModal(false)} />}
      {macModal && <MacInstallModal onClose={() => setMacModal(false)} />}
      {samsungModal && (
        <SamsungInstallModal onClose={() => setSamsungModal(false)} />
      )}
    </>
  );
}

function ModalShell({
  titleId,
  title,
  icon,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  icon: JSX.Element;
  onClose: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            id={titleId}
            className="text-lg font-bold text-fg inline-flex items-center gap-2"
          >
            {icon}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted hover:text-fg p-1"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 rounded-full bg-primary text-white text-sm font-semibold py-2.5"
        >
          확인
        </button>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }): JSX.Element {
  return (
    <li className="flex gap-3">
      <span className="flex-none w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function IOSInstallModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <ModalShell
      titleId="ios-install-title"
      title="iPhone에 설치하기"
      icon={<AppleLogo size={18} />}
      onClose={onClose}
    >
      <p className="text-sm text-muted mb-4">
        iOS는 Safari에서만 앱(PWA) 설치가 가능합니다. 아래 3단계를 따라주세요.
      </p>
      <ol className="space-y-3 text-sm text-fg">
        <Step n={1}>
          화면 <b>아래 가운데</b>의{" "}
          <Share size={14} className="inline align-text-bottom" aria-hidden />{" "}
          <b>공유 버튼</b>을 누르세요.
        </Step>
        <Step n={2}>
          메뉴를 아래로 스크롤해서{" "}
          <Plus size={14} className="inline align-text-bottom" aria-hidden />{" "}
          <b>"홈 화면에 추가"</b>를 선택하세요.
        </Step>
        <Step n={3}>
          우측 상단 <b>"추가"</b> 버튼을 누르면 홈 화면에 앱 아이콘이 생깁니다.
        </Step>
      </ol>
      <p className="text-xs text-muted mt-4 pt-3 border-t border-divider inline-flex items-start gap-1.5">
        <Lightbulb size={14} aria-hidden className="flex-none mt-0.5" />
        <span>
          Chrome 등 다른 브라우저로 보고 계시면 Safari에서 이 페이지를 다시
          열어주세요.
        </span>
      </p>
    </ModalShell>
  );
}

function MacInstallModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <ModalShell
      titleId="mac-install-title"
      title="Mac에 설치하기"
      icon={<AppleLogo size={18} />}
      onClose={onClose}
    >
      <p className="text-sm text-muted mb-4">
        Safari 17 이상은 메뉴에서 직접 Dock에 추가할 수 있습니다.
      </p>
      <ol className="space-y-3 text-sm text-fg">
        <Step n={1}>
          메뉴바의 <b>파일</b> 메뉴를 엽니다.
        </Step>
        <Step n={2}>
          <b>"Dock에 추가"</b>를 선택합니다.
        </Step>
        <Step n={3}>
          이름을 확인하고 <b>"추가"</b>를 누르면 Dock·Launchpad에서 실행할 수
          있습니다.
        </Step>
      </ol>
      <p className="text-xs text-muted mt-4 pt-3 border-t border-divider inline-flex items-start gap-1.5">
        <Lightbulb size={14} aria-hidden className="flex-none mt-0.5" />
        <span>
          Chrome·Edge를 쓰는 경우 주소창 오른쪽의 <b>설치 아이콘</b>을
          클릭하세요.
        </span>
      </p>
    </ModalShell>
  );
}

function SamsungInstallModal({
  onClose,
}: {
  onClose: () => void;
}): JSX.Element {
  return (
    <ModalShell
      titleId="samsung-install-title"
      title="삼성 인터넷에 설치하기"
      icon={<Smartphone size={18} />}
      onClose={onClose}
    >
      <p className="text-sm text-muted mb-4">
        자동 설치 창이 뜨지 않으면 아래 방법을 따라주세요.
      </p>
      <p className="text-sm font-bold text-fg mb-2">방법 1 — 주소창 + 아이콘</p>
      <ol className="space-y-3 text-sm text-fg mb-4">
        <Step n={1}>
          주소창 오른쪽에 <b>+ 아이콘</b>이 보이면 누르세요.
        </Step>
        <Step n={2}>
          나오는 메뉴에서 <b>"홈 화면"</b>을 선택하세요.
        </Step>
        <Step n={3}>
          이름을 확인하고 <b>"추가"</b>를 누르면 홈 화면에 앱 아이콘이 생깁니다.
        </Step>
      </ol>
      <p className="text-sm font-bold text-fg mb-2">방법 2 — ⋮ 메뉴에서 추가</p>
      <ol className="space-y-3 text-sm text-fg">
        <Step n={1}>
          화면 오른쪽 아래 <b>⋮ (더보기)</b> 메뉴를 누르세요.
        </Step>
        <Step n={2}>
          <b>"현재 페이지 추가"</b> → <b>"홈 화면"</b>을 선택하세요.
        </Step>
        <Step n={3}>
          이름을 확인하고 <b>"추가"</b>를 누르면 완료됩니다.
        </Step>
      </ol>
      <p className="text-xs text-muted mt-4 pt-3 border-t border-divider inline-flex items-start gap-1.5">
        <Lightbulb size={14} aria-hidden className="flex-none mt-0.5" />
        <span>
          + 아이콘이 없으면 방법 2(⋮ 메뉴)로 설치하세요. 설치 후에는 인터넷
          없이도 사용할 수 있습니다.
        </span>
      </p>
    </ModalShell>
  );
}
