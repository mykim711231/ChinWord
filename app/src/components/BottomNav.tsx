import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "홈", icon: "🏠" },
  { to: "/situations", label: "단어", icon: "📂" },
  { to: "/idioms", label: "성어", icon: "📜" },
  { to: "/flashcards", label: "복습", icon: "🃏" },
  { to: "/settings", label: "설정", icon: "⚙" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t safe-bottom" style={{ borderColor: "var(--color-divider)", backgroundColor: "var(--color-surface)" }}>
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs no-underline"
            style={({ isActive }) => ({
              color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: isActive ? 600 : 400,
            })}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
