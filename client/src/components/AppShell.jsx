import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookCopy,
  CalendarDays,
  FolderOpen,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Library,
  LogOut,
  Mail,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import Logo from './Logo.jsx';

// The menu for each role. soon: true = a page that doesn't exist yet (shown, but not clickable).
const NAV_ITEMS = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/grades', label: 'Grades', icon: GraduationCap },
    { to: '/courses', label: 'Course catalog', icon: Library },
    { label: 'Class schedule', icon: CalendarDays, soon: true },
    { label: 'Resources', icon: FolderOpen, soon: true },
  ],
  instructor: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/courses', label: 'Course catalog', icon: Library },
    { label: 'Class schedule', icon: CalendarDays, soon: true },
    { label: 'Resources', icon: FolderOpen, soon: true },
  ],
  admin: [
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookCopy },
    { to: '/courses', label: 'Course catalog', icon: Library },
  ],
};

// "Demo Student" → "DS", for the round avatar.
function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// The frame around every logged-in page: sidebar on the left, top bar, then the page itself.
export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false); // phones only: is the sidebar slid in?

  // Close the phone menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside id="sidebar" className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Main menu">
        <div className="sidebar-brand">
          <Logo />
        </div>

        <nav>
          {NAV_ITEMS[user.role].map((item) =>
            item.soon ? (
              <span key={item.label} className="nav-item disabled" aria-disabled="true">
                <item.icon size={20} aria-hidden="true" />
                {item.label}
                <span className="tag tag-soon">Soon</span>
              </span>
            ) : (
              // NavLink adds the "active" class to the link for the page you're on
              <NavLink key={item.to} to={item.to} end className="nav-item">
                <item.icon size={20} aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <nav className="sidebar-bottom">
          <NavLink to="/change-password" className="nav-item">
            <KeyRound size={20} aria-hidden="true" />
            Password
          </NavLink>
          <button type="button" className="nav-item" onClick={handleLogout}>
            <LogOut size={20} aria-hidden="true" />
            Log out
          </button>
        </nav>
      </aside>

      {/* Phones: a dark layer behind the open menu; tapping it closes the menu */}
      <div className={menuOpen ? 'sidebar-backdrop open' : 'sidebar-backdrop'} onClick={() => setMenuOpen(false)} />

      <div className="app-content">
        <header className="topbar">
          <button
            type="button"
            className="icon-button menu-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Placeholders: these features don't exist yet, so they're shown but disabled */}
          <label className="search" title="Search is coming soon">
            <Search size={18} aria-hidden="true" />
            <span className="visually-hidden">Search (coming soon)</span>
            <input type="search" placeholder="Search: coming soon" disabled />
          </label>

          <div className="topbar-actions">
            <button type="button" className="icon-button" disabled title="Messages: coming soon">
              <Mail size={20} />
              <span className="visually-hidden">Messages (coming soon)</span>
            </button>
            <button type="button" className="icon-button" disabled title="Notifications: coming soon">
              <Bell size={20} />
              <span className="visually-hidden">Notifications (coming soon)</span>
            </button>
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
              <span className="user-chip-text">
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </span>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
