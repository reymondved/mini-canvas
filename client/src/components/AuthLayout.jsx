import Illustration from './Illustration.jsx';
import Logo from './Logo.jsx';

// The layout for the login and forgot-password pages:
// a blue welcome panel on the left (hidden on phones) and the form card on the right.
export default function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-showcase" aria-hidden="true">
        <Logo light />
        <div>
          <Illustration />
          <h2>Your courses, assignments and grades in one place.</h2>
          <p>A demo learning platform built step by step with React, Express and PostgreSQL.</p>
        </div>
        <small>Demo project · fake data only</small>
      </section>

      <div className="auth-main">
        <div className="card auth-card">
          <div className="auth-card-logo">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
