import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireLoginAllowingPasswordChange } from '../middleware/requireLogin.js';

const MIN_PASSWORD_LENGTH = 8;

const router = Router();

// POST /api/auth/login — check email + password, then start a session.
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  // Never trust the browser: check the input again on the server.
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // $1 is a placeholder: the email is sent separately, so it can't change the SQL (no SQL injection).
  const result = await pool.query(
    'SELECT id, name, email, role, password_hash, is_active, must_change_password FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  const user = result.rows[0];

  // bcrypt.compare hashes the typed password and compares it to the stored hash.
  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));

  // Same message for "no such email", "wrong password" and "deactivated account",
  // so nobody can use this form to discover which emails exist.
  if (!passwordMatches || !user.is_active) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Give the browser a brand-new session ID on login (prevents "session fixation" attacks).
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not start session.' });
    }
    req.session.userId = user.id;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password,
      },
    });
  });
});

// POST /api/auth/change-password — any logged-in user, including one with a temporary password.
router.post('/change-password', requireLoginAllowingPasswordChange, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 200) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from the current one.' });
  }

  // Prove it's really you: someone who finds an unlocked computer can't change your password.
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
    [await bcrypt.hash(newPassword, 12), req.user.id]
  );
  res.json({ user: { ...req.user, must_change_password: false } });
});

// POST /api/auth/logout — throw the session away and clear the cookie.
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

// GET /api/auth/me — who is logged in right now? (used after a page refresh)
// Also works with a temporary password, so the app knows to show the Change password page.
router.get('/me', requireLoginAllowingPasswordChange, (req, res) => {
  res.json({ user: req.user });
});

export default router;
