import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function Layout() {
  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <main className="max-w-lg mx-auto px-4 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
