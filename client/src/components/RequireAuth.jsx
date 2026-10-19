import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import AppHeader from './AppHeader.jsx';

// Wraps every page that needs a login. Not logged in → go to the login page.
// This only improves the experience: the real protection is the server's requireLogin check.
export default function RequireAuth() {
  const { user } = useAuth();

  if (user === undefined) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }
  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  // <Outlet /> is where the matching child page (dashboard, course...) appears.
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}
