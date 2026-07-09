import { Link, Outlet, useLocation } from "react-router-dom";
import "./AppShell.css";

export function AppShell() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  // The play screen must fit the visible viewport exactly (music-stand tablet
  // use) — pin the shell to the dynamic viewport height so nothing scrolls off.
  const isPlay = pathname.startsWith("/play");

  return (
    <div className={`app-shell${isPlay ? " app-shell--fit" : ""}`}>
      <header className="app-header">
        <Link to="/" className="app-brand" aria-label="Piano Tutor home">
          <span className="app-brand__logo" aria-hidden="true">🎹</span>
          <span className="app-brand__name">Piano Tutor</span>
        </Link>
        {!isHome && (
          <nav className="app-nav" aria-label="Main">
            <Link to="/library">Songs</Link>
            <Link to="/learn">Learn</Link>
            <Link to="/practice">Practice</Link>
            <Link to="/progress">Progress</Link>
          </nav>
        )}
        <Link to="/settings" className="app-settings" aria-label="Settings">
          ⚙️
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
