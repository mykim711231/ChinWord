import { NavLink, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  BookOpen,
  ScrollText,
  GraduationCap,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: "홈", icon: HomeIcon, end: true, match: ["/"] },
  {
    to: "/words",
    label: "단어",
    icon: BookOpen,
    end: false,
    match: ["/words", "/word/", "/situations", "/vocab/", "/toc", "/hsk"],
  },
  {
    to: "/idioms",
    label: "성어",
    icon: ScrollText,
    end: false,
    match: ["/idioms", "/idiom/"],
  },
  {
    to: "/learn",
    label: "학습",
    icon: GraduationCap,
    end: false,
    match: ["/learn", "/listen", "/strokes"],
  },
  { to: "/settings", label: "설정", icon: SettingsIcon, end: false, match: ["/settings"] },
];

export function BottomNav(): JSX.Element {
  const loc = useLocation();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-divider pb-safe"
    >
      <ul className="mx-auto max-w-screen-sm grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end, match }) => {
          const isActiveByPath = match.some((m) =>
            m === "/" ? loc.pathname === "/" : loc.pathname.startsWith(m),
          );
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] text-xs",
                    isActive || isActiveByPath
                      ? "text-primary font-semibold"
                      : "text-muted",
                  )
                }
              >
                <Icon size={20} aria-hidden />
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
