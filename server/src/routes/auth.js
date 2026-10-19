import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

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
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  const user = result.rows[0];

  // bcrypt.compare hashes the typed password and compares it to the stored hash.
  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));

  // Same message for "no such email" and "wrong password",
  // so nobody can use this form to discover which emails exist.
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Give the browser a brand-new session ID on login (prevents "session fixation" attacks).
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not start session.' });
    }
    req.session.userId = user.id;
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
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
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [
    req.session.userId,
  ]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  res.json({ user });
});

export default router;
