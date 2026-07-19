// App shell for guarded routes: a top brand bar (desktop) and a fixed bottom tab bar
// (mobile). Nav has <= 5 items so a bottom tab bar is the mobile pattern.
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = (user?.email?.[0] || 'R').toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">📚</span>
            <span className="brand-name">BookNook</span>
          </div>
          <nav className="topnav" aria-label="Primary">
            <NavLink to="/shelf" className="topnav-link">Shelf</NavLink>
            {user?.is_admin && (
              <NavLink to="/admin/settings" className="topnav-link">Settings</NavLink>
            )}
          </nav>
          <div className="topbar-user">
            <span className="avatar" title={user?.email}>{initial}</span>
            <button className="btn-ghost" onClick={handleLogout} data-testid="logout-button">Sign out</button>
          </div>
        </div>
      </header>

      <main className="app-main" data-testid="app-main">{children}</main>

      <nav className="bottomnav" aria-label="Primary mobile">
        <NavLink to="/shelf" className="bottomnav-item" data-testid="nav-shelf">
          <BookIcon />
          <span>Shelf</span>
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin/settings" className="bottomnav-item" data-testid="nav-admin">
            <GearIcon />
            <span>Settings</span>
          </NavLink>
        )}
        <button className="bottomnav-item bottomnav-btn" onClick={handleLogout} data-testid="nav-logout">
          <LogoutIcon />
          <span>Sign out</span>
        </button>
      </nav>
    </div>
  );
}
