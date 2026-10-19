import { pool } from '../db.js';

// "Middleware" runs before a route. This one only lets logged-in users through,
// and puts the current user on req.user so the route knows who is asking.
export async function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [
    req.session.userId,
  ]);
  if (!result.rows[0]) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  req.user = result.rows[0];
  next(); // continue to the actual route
}
