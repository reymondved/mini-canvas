import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Top bar on every logged-in page.
export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-header">
      <Link to={isAdmin ? '/admin/users' : '/dashboard'} className="app-brand">
        <img src="/hau-logo.webp" alt="" />
        <span>Mini Canvas</span>
      </Link>
      {/* NavLink adds an "active" class to the link for the page you're on */}
      <nav className="app-nav">
        {isAdmin ? (
          <>
            <NavLink to="/admin/users">Users</NavLink>
            <NavLink to="/admin/courses">Courses</NavLink>
          </>
        ) : (
          <NavLink to="/dashboard">Dashboard</NavLink>
        )}
        {user.role === 'student' && <NavLink to="/grades">Grades</NavLink>}
        <NavLink to="/change-password">Password</NavLink>
      </nav>
      <div className="app-user">
        <span className="app-user-name">
          {user.name} <span className="course-code">{user.role}</span>
        </span>
        <button type="button" className="btn btn-light" onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}
