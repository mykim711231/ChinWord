import type { ReactNode } from "react";
import Header from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      {/* 키보드 사용자용 본문 바로가기 — 포커스 시에만 노출 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-card"
      >
        본문으로 건너뛰기
      </a>
      <Header />
      <main
        id="main"
        className="flex-1 mx-auto w-full max-w-screen-sm px-4 sm:px-6 pt-4 pb-32"
      >
        {children}
        {/* Footer 는 main 안(하단 패딩 영역 위)에 둬 고정 BottomNav 에 가리지 않게 한다 */}
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
}
