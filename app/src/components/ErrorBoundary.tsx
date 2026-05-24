import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown): void {
    // 콘솔로만 흘려도 충분 — 외부 로깅은 도입 시 추가.
    console.error("[ChinWord] render error:", error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg text-fg">
          <div className="max-w-md w-full text-center">
            <div className="mb-3 flex justify-center text-primary" aria-hidden>
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-xl font-semibold mb-2">화면을 표시할 수 없습니다</h1>
            <p className="text-sm text-muted mb-4">
              일시적인 오류가 발생했습니다. 새로고침 또는 홈으로 이동해 보세요.
            </p>
            <details className="text-left text-xs text-muted bg-surface border border-divider rounded-card p-3 mb-4">
              <summary className="cursor-pointer">오류 상세</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.error.message}
              </pre>
            </details>
            <div className="flex gap-2 justify-center">
              <button type="button" className="btn-primary text-sm" onClick={() => location.reload()}>
                새로고침
              </button>
              <button
                type="button"
                className="btn-ghost text-sm border border-divider"
                onClick={() => {
                  this.reset();
                  location.hash = "#/";
                }}
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
