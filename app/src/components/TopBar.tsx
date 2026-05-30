import type { ReactNode } from "react";

/**
 * Per-page subheader (title + optional right slot).
 * Global navigation lives in <Header />; this only renders the in-page title row.
 * 뒤로가기는 전역 Header 의 chevron 이 담당하므로 여기엔 별도 prop 이 없다.
 */
export function TopBar({
  title,
  subtitle,
  right,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}): JSX.Element | null {
  if (!title && !subtitle && !right) return null;
  return (
    <div className="flex items-center justify-between gap-2 mt-1 mb-2">
      <div className="min-w-0">
        {title ? <h1 className="text-lg font-semibold truncate">{title}</h1> : null}
        {subtitle ? <div className="text-xs text-muted truncate">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-1 flex-none">{right}</div> : null}
    </div>
  );
}
