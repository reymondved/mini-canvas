import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Placeholder page after login. The real dashboard arrives in Phase 4.
export default function HomePage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // useEffect runs code after the page appears; [] means "only once".
  // We ask the server who is logged in. No session → back to the login page.
  useEffect(() => {
    fetch('/api/auth/me').then(async (response) => {
      if (!response.ok) {
        navigate('/login', { replace: true });
        return;
      }
      const data = await response.json();
      setUser(data.user);
    });
  }, [navigate]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login', { replace: true });
  }

  if (!user) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p className="muted">
            Signed in as {user.email} · <span className="course-code">{user.role}</span>
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleLogout}>Log out</button>
      </header>
      <div className="card">
        <p>Your courses will appear here in Phase 4.</p>
      </div>
    </main>
  );
}
