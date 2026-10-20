import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

const MIN_PASSWORD_LENGTH = 8; // must match the server

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const mustChange = user.must_change_password;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!currentPassword || !newPassword) return setError('Please fill in all fields.');
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (newPassword !== confirmPassword) return setError('The two new passwords do not match.');

    setSaving(true);
    try {
      const body = await api('/api/auth/change-password', {
        method: 'POST',
        json: { currentPassword, newPassword },
      });
      setUser(body.user); // no longer "must change", so the rest of the app unlocks
      if (mustChange) {
        navigate(user.role === 'admin' ? '/admin/users' : '/dashboard', { replace: true });
        return;
      }
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page narrow">
      <h1>Change password</h1>
      {mustChange && (
        <p className="notice" role="status">
          You're signed in with a temporary password. Choose your own password to continue.
        </p>
      )}
      {done && <p className="notice" role="status">Your password has been changed.</p>}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="current-password">{mustChange ? 'Temporary password' : 'Current password'}</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="muted small">At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>
        <div className="field">
          <label htmlFor="confirm-password">Repeat new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </main>
  );
}
