import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { applySettingsToDom } from "./state/settings";
import { useUpdateStore } from "./state/useUpdateStore";
import { requestPersistentStorage } from "./lib/storage";
import "./styles/index.css";

// 첫 페인트 이전에 테마/폰트 클래스 적용 — flash of incorrect theme 회피.
try {
  applySettingsToDom();
} catch {
  /* zustand persist 미수화 시 무시 — 이후 App effect에서 다시 적용 */
}

// 학습 기록이 브라우저 자동 정리(iOS 7일 미사용 등)로 사라지지 않도록
// 영구 저장소 승격을 요청한다. 멱등이므로 매 부팅 호출해도 무방.
void requestPersistentStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ---------------------------------------------------------------------------
// SW 진행률 — B 방식 (다음 실행 시 자동 적용)
//
//   원칙: 사용자가 앱을 사용하는 도중에는 절대 방해하지 않는다.
//   새 SW 가 발견되면 백그라운드에서 precache 만 하고 waiting 으로 대기한다.
//   사용자가 앱을 완전히 종료 후 다시 열면 새 SW 가 활성화된다.
//
//   sw.ts(injectManifest) 가 precache fetch 한 건마다
//   { type:'sw-precache-progress', phase, pct } 를 postMessage 한다.
//   첫 설치 시에만 진행 바를 보여주고, 업데이트는 조용히 넘어간다.
// ---------------------------------------------------------------------------

let installTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

// precache 가 이 시간 안에 끝나지 않으면 실패로 간주.
const INSTALL_TIMEOUT_MS = 60_000;

function clearInstallTimeout(): void {
  if (installTimeoutTimer) {
    clearTimeout(installTimeoutTimer);
    installTimeoutTimer = null;
  }
}

/** precache 실패/타임아웃 → 에러 UI 표시 */
function failInstall(): void {
  clearInstallTimeout();
  useUpdateStore.getState().setError();
}

type SwProgressMsg = {
  type: "sw-precache-progress";
  phase: "downloading" | "installing" | "installed" | "error";
  pct: number;
  completed: number;
  total: number;
};

/** 설치 중인 SW 감시 — 타임아웃/redundant 안전망. */
function watchInstall(worker: ServiceWorker): void {
  useUpdateStore.getState().setPhase("downloading", 0);
  clearInstallTimeout();
  installTimeoutTimer = setTimeout(failInstall, INSTALL_TIMEOUT_MS);
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" || worker.state === "activated") {
      clearInstallTimeout();
    } else if (worker.state === "redundant") {
      failInstall();
    }
  });
}

/** 에러 UI 의 "다시 시도" — registration.update() 로 precache 재시도. */
function retryInstall(): void {
  const reg = swRegistration;
  if (!reg) {
    useUpdateStore.getState().dismiss();
    return;
  }
  useUpdateStore.getState().setPhase("downloading", 0);
  reg
    .update()
    .then(() => {
      if (reg.installing) {
        watchInstall(reg.installing);
      } else {
        useUpdateStore.getState().dismiss();
      }
    })
    .catch(failInstall);
}

registerSW({
  onRegisteredSW(_swUrl, r) {
    if (!r) return;
    swRegistration = r;

    // 이미 대기 중인 SW — 다음 실행 시 자연스럽게 적용 (B 방식).
    if (r.waiting) return;

    // 새로 설치 중인 SW — precache 진행률 감시
    if (r.installing) {
      watchInstall(r.installing);
      return;
    }

    // 첫 등록: 수동 업데이트 체크
    r.update()
      .then(() => {
        if (r.installing) watchInstall(r.installing);
      })
      .catch(() => {
        /* 네트워크 없음 — 무시 */
      });
  },

  onNeedRefresh() {
    // B 방식: 새 SW 가 waiting 으로 들어와도 알리지 않는다.
    // 다음에 앱을 다시 열면 자연스럽게 활성화된다.
    clearInstallTimeout();
    useUpdateStore.getState().dismiss();
  },

  onOfflineReady() {
    // 네트워크 없어도 동작 가능 — 별도 안내 불필요.
  },
});

// 에러 UI 의 "다시 시도" 버튼이 호출할 함수 등록
useUpdateStore.getState().setRetryFn(retryInstall);

// SW 가 postMessage 로 보내는 precache 진행률 수신
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as
      | { type?: string; phase?: string; pct?: number }
      | null;
    if (!data) return;
    if (data.type !== "sw-precache-progress") return;
    const msg = data as SwProgressMsg;

    if (msg.phase === "error") {
      failInstall();
      return;
    }
    if (msg.phase === "installed") {
      // 설치 완료 → 100% 표시 후 2초 뒤 자동으로 토스트를 닫는다.
      useUpdateStore.getState().setPhase("installing", 100);
      setTimeout(() => useUpdateStore.getState().dismiss(), 2000);
      return;
    }
    // downloading / installing 진행률
    useUpdateStore.getState().setPhase(msg.phase, msg.pct);
  });

  // iOS standalone PWA 에서 SW 가 종료되지 않고 살아있는 문제 대응:
  // 앱으로 돌아올 때마다 등록을 갱신해 대기 중인 SW 를 발견한다.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.update().catch(() => {
        /* 네트워크 없음 */
      });
    });
  });
}
