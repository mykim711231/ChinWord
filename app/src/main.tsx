import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applySettingsToDom } from "./state/settings";
import "./styles/index.css";

// 첫 페인트 이전에 테마/폰트 클래스 적용 — flash of incorrect theme 회피.
try {
  applySettingsToDom();
} catch {
  /* zustand persist 미수화 시 무시 — 이후 App effect에서 다시 적용 */
}

// IndexedDB 영구 저장 권한 요청 (브라우저가 지원하는 경우).
if (
  typeof navigator !== "undefined" &&
  navigator.storage &&
  typeof navigator.storage.persist === "function"
) {
  void navigator.storage.persist().catch(() => undefined);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
