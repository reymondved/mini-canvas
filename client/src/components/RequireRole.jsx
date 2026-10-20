import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';

// Wraps pages for one role (e.g. admin pages). Other users are sent back to their dashboard.
// Like RequireAuth, this is only for a nicer experience: the server's requireRole is the real lock.
// Use INSIDE RequireAuth, so we already know who is logged in.
export default function RequireRole({ role }) {
  const { user } = useAuth();
  if (user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
