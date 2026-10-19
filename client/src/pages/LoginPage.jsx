import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks the form values and returns an object of error messages.
// An empty object means everything is valid.
function validate(email, password) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Please enter your email.';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Please enter a valid email, like student@example.com.';
  }
  if (!password) {
    errors.password = 'Please enter your password.';
  }
  return errors;
}

export default function LoginPage() {
  // "State" is data React remembers between renders.
  // When state changes, React redraws the page automatically.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // "async" lets us "await" the server's answer without freezing the page.
  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    const newErrors = validate(email, password);
    setErrors(newErrors);
    setServerError('');
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      // fetch() sends a request to our Express server (through the Vite proxy).
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        navigate('/home');
        return;
      }
      const data = await response.json();
      setServerError(data.error);
    } catch {
      setServerError("Can't reach the server. Is it running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <img src="/hau-logo.webp" alt="Holy Angel University seal" className="auth-logo" />
        <h1>Mini Canvas</h1>
        <p className="muted">Sign in to your demo account</p>

        {/* noValidate turns off the browser's built-in popups so our own messages show */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && <p id="password-error" className="field-error">{errors.password}</p>}
          </div>

          {serverError && <p className="alert-error" role="alert">{serverError}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password">Forgot Password?</Link>
          <Link to="/courses">Browse courses</Link>
        </div>
      </div>
    </main>
  );
}
