import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import AppShell from './AppShell.jsx';

// Wraps every page that needs a login. Not logged in → go to the login page.
// This only improves the experience: the real protection is the server's requireLogin check.
export default function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }
  if (user === null) {
    return <Navigate to="/login" replace />;
  }
  // Still on a temporary password? The only page you may see is "Change password".
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // <Outlet /> is where the matching child page (dashboard, course...) appears.
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
