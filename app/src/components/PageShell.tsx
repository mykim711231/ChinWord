import type { ReactNode } from "react";

/**
 * Inner page wrapper — Layout already supplies Header / Footer / BottomNav
 * and the outer column. PageShell is now just a semantic placeholder so
 * existing route components continue to compile without churn.
 */
export function PageShell({ children }: { children: ReactNode }): JSX.Element {
  return <>{children}</>;
}
