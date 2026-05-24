import { NavLink, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  BookOpen,
  Search as SearchIcon,
  GraduationCap,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSrs } from "@/state/srsStore";

const items = [
  { to: "/", label: "홈", icon: HomeIcon, end: true },
  { to: "/situations", label: "목차", icon: BookOpen, end: false },
  { to: "/search", label: "검색", icon: SearchIcon, end: false },
  { to: "/flashcards", label: "학습", icon: GraduationCap, end: false },
  { to: "/settings", label: "설정", icon: SettingsIcon, end: false },
];

export function BottomNav(): JSX.Element {
  const loc = useLocation();
  const due = useSrs((s) => s.dueCards()).length;

  // 단어/성어 상세·목록은 "목차" 탭 활성으로 표시
  const onTocLegacy =
    loc.pathname.startsWith("/idioms") ||
    loc.pathname.startsWith("/vocab") ||
    loc.pathname.startsWith("/idiom/");

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-divider pb-safe"
    >
      <ul className="mx-auto max-w-screen-sm grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] text-xs",
                  isActive || (to === "/situations" && onTocLegacy)
                    ? "text-primary font-semibold"
                    : "text-muted",
                )
              }
            >
              <Icon size={20} aria-hidden />
              <span>{label}</span>
              {to === "/flashcards" && due > 0 ? (
                <span className="absolute top-1 right-1/4 bg-primary text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {due}
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
