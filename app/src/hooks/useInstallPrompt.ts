import { useState, useEffect, useCallback } from "react";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if dismissed recently
    const dismissed = localStorage.getItem("chinvoca-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      setShowGuide(false);
    } else {
      // Show after 3 seconds on first visit
      const t = setTimeout(() => setShowGuide(true), 3000);
      return () => clearTimeout(t);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowGuide(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowGuide(false);
    localStorage.setItem("chinvoca-install-dismissed", String(Date.now()));
  }, []);

  return { showGuide, setShowGuide, install, dismiss, canInstall: !!deferredPrompt };
}
