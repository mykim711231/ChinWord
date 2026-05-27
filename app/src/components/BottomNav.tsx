import { NavLink, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  BookOpen,
  ScrollText,
  GraduationCap,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  to: string;
  label: string;
  icon: typeof HomeIcon;
  end: boolean;
  match: string[];
  exclude?: string[];
};

const items: NavItem[] = [
  { to: "/", label: "홈", icon: HomeIcon, end: true, match: ["/"] },
  {
    to: "/vocab",
    label: "단어장",
    icon: BookOpen,
    end: false,
    match: ["/vocab"],
    exclude: ["/vocab/idioms"],
  },
  {
    to: "/vocab/idioms",
    label: "성어",
    icon: ScrollText,
    end: false,
    match: ["/vocab/idioms", "/idioms", "/idiom"],
  },
  {
    to: "/learn",
    label: "학습",
    icon: GraduationCap,
    end: false,
    match: ["/learn", "/listen", "/strokes", "/flashcards"],
  },
  { to: "/search", label: "검색", icon: SearchIcon, end: false, match: ["/search"] },
  { to: "/settings", label: "설정", icon: SettingsIcon, end: false, match: ["/settings"] },
];

export function BottomNav(): JSX.Element {
  const loc = useLocation();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-divider pb-safe"
    >
      <ul className="mx-auto max-w-screen-sm grid grid-cols-6">
        {items.map(({ to, label, icon: Icon, end, match, exclude }) => {
          const isActiveByPath =
            match.some((m) =>
              m === "/" ? loc.pathname === "/" : loc.pathname.startsWith(m),
            ) &&
            !(exclude ?? []).some((x) => loc.pathname.startsWith(x));
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] text-[10px]",
                    isActive || isActiveByPath
                      ? "text-primary font-semibold"
                      : "text-muted",
                  )
                }
              >
                <Icon size={18} aria-hidden />
                <span>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
