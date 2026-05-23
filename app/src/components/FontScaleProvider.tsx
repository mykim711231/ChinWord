import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const fontScale = useSettingsStore((s) => s.fontScale);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(fontScale()));
  }, [fontScale]);

  return <>{children}</>;
}
