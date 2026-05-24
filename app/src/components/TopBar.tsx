import type { ReactNode } from "react";

/**
 * Per-page subheader (title + optional right slot).
 * Global navigation lives in <Header />; this only renders the in-page title row.
 * `back` prop is retained for API compatibility but no longer renders a button
 * — the global Header already shows a back chevron on non-home routes.
 */
export function TopBar({
  title,
  subtitle,
  right,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
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
