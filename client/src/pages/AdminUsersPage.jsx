import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import AnnouncementsPanel from '../components/AnnouncementsPanel.jsx';

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/users')
      .then((body) => setUsers(body.users))
      .catch((err) => setError(err.message));
  }, []);

  // Replace one user in the list with the updated version from the server.
  function updateUser(updated) {
    setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function toggleActive(user) {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Really ${action} ${user.name}?`)) return;
    try {
      const body = await api(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        json: { isActive: !user.is_active },
      });
      updateUser(body.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page">
      <h1>Users</h1>
      <p className="muted">Create accounts and deactivate people who should no longer log in.</p>

      <div className="page-section">
        <AnnouncementsPanel
          heading="Site-wide announcements"
          loadUrl="/api/announcements"
          postUrl="/api/admin/announcements"
        />
      </div>

      <CreateUserForm onCreated={(user) => setUsers((list) => [...list, user])} />

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!users && !error && <p className="muted">Loading…</p>}

      {users && (
        <section className="card">
          <h2>All users ({users.length})</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.is_active ? '' : 'row-inactive'}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="course-code">{u.role}</span></td>
                    <td>
                      {u.is_active ? <span className="tag tag-done">Active</span> : <span className="tag tag-past">Deactivated</span>}
                      {u.must_change_password && <span className="tag tag-late">Temporary password</span>}
                    </td>
                    <td>
                      {u.id === me.id ? (
                        <span className="muted small">You</span>
                      ) : (
                        <button type="button" className="btn btn-small" onClick={() => toggleActive(u)}>
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function CreateUserForm({ onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { user, temporaryPassword } right after creating
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setCreated(null);
    if (!name.trim() || !email.trim()) return setError('Name and email are required.');

    setSaving(true);
    try {
      const body = await api('/api/admin/users', { method: 'POST', json: { name, email, role } });
      setCreated(body);
      onCreated(body.user);
      setName('');
      setEmail('');
      setRole('student');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card admin-section">
      <h2>Create a user</h2>
      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="new-name">Name</label>
          <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="new-email">Email</label>
          <input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="new-role">Role</label>
          <select id="new-role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-grid-action">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>

      {error && <p className="alert-error" role="alert">{error}</p>}

      {created && (
        <div className="notice" role="status">
          <p>
            <strong>{created.user.name}</strong> was created. Give them this temporary password.
            It is shown <strong>only once</strong>, and they must change it when they first log in:
          </p>
          <p className="temp-password">
            <code>{created.temporaryPassword}</code>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => navigator.clipboard.writeText(created.temporaryPassword)}
            >
              Copy
            </button>
          </p>
        </div>
      )}
    </section>
  );
}
