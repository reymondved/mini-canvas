import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Top bar on every logged-in page.
export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-header">
      <Link to="/dashboard" className="app-brand">
        <img src="/hau-logo.webp" alt="" />
        <span>Mini Canvas</span>
      </Link>
      <div className="app-user">
        <span className="app-user-name">
          {user.name} <span className="course-code">{user.role}</span>
        </span>
        <button type="button" className="btn btn-light" onClick={handleLogout}>Log out</button>
      </div>
    </header>
  );
}
