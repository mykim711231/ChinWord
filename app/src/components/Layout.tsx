import type { ReactNode } from "react";
import Header from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";

export default function Layout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <Header />
      <main
        id="main"
        className="flex-1 mx-auto w-full max-w-screen-sm px-4 sm:px-6 pt-4 pb-32"
      >
        {children}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
