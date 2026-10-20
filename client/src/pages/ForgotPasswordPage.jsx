import { useState } from 'react';
import { Link } from 'react-router';
import AuthLayout from '../components/AuthLayout.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Please enter a valid email, like student@example.com.');
      return;
    }
    setError('');
    // No server yet. Later the backend will create a reset link
    // and print it in the terminal (no real emails in this demo).
    setSent(true);
  }

  return (
    <AuthLayout>
      <h1>Reset your password</h1>

      {sent ? (
        <p className="notice" role="status">
          If an account exists for <strong>{email.trim()}</strong>, a reset link would be sent.
          (Demo: password reset arrives in a later phase.)
        </p>
      ) : (
        <>
          <p className="muted">Enter your account email and we'll help you reset your password.</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'reset-email-error' : undefined}
              />
              {error && <p id="reset-email-error" className="field-error">{error}</p>}
            </div>
            <button type="submit" className="btn btn-primary">Send reset link</button>
          </form>
        </>
      )}

      <div className="auth-links">
        <Link to="/login">← Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
