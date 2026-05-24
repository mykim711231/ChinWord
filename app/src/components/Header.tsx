import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Search as SearchIcon, Settings as SettingsIcon, Info } from "lucide-react";

export default function Header(): JSX.Element {
  const loc = useLocation();
  const navigate = useNavigate();
  const onHome = loc.pathname === "/";

  const handleBack = (): void => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/95 border-b border-divider pt-safe">
      <div className="mx-auto max-w-screen-sm px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {!onHome && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="뒤로 가기"
              className="w-11 h-11 -ml-2 inline-flex items-center justify-center rounded-lg hover:bg-primary-soft text-fg"
            >
              <ChevronLeft size={24} aria-hidden />
            </button>
          )}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-fg text-lg min-w-0"
            aria-label="홈으로"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt=""
              aria-hidden
              width={28}
              height={28}
              className="w-7 h-7 rounded-md flex-none"
            />
            <span className="truncate">
              <span className="text-primary">ChinWord</span>{" "}
              <span className="hidden sm:inline text-fg/80 text-sm font-medium">中国语</span>
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-1">
          {!onHome && (
            <Link
              to="/search"
              aria-label="검색"
              className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-primary-soft text-fg"
            >
              <SearchIcon size={20} aria-hidden />
            </Link>
          )}
          <Link
            to="/about"
            aria-label="정보"
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-primary-soft text-fg"
          >
            <Info size={20} aria-hidden />
          </Link>
          <Link
            to="/settings"
            aria-label="설정"
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-primary-soft text-fg"
          >
            <SettingsIcon size={20} aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}
