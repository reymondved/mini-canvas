import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail, findUserById, toPublicUser } from '../data/users.js';

const router = Router();

// POST /api/auth/login — check email + password, then start a session.
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  // Never trust the browser: check the input again on the server.
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = findUserByEmail(email);
  // bcrypt.compare hashes the typed password and compares it to the stored hash.
  const passwordMatches = user && (await bcrypt.compare(password, user.passwordHash));

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
    res.json({ user: toPublicUser(user) });
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
router.get('/me', (req, res) => {
  const user = req.session.userId && findUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  res.json({ user: toPublicUser(user) });
});

export default router;
