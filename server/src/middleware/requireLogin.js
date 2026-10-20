import { pool } from '../db.js';

// Loads the logged-in user from the database, or answers 401 and returns nothing.
// Checked on EVERY request, so a deactivated user is locked out immediately,
// even if they still have a valid session cookie.
async function loadActiveUser(req, res) {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not logged in.' });
    return null;
  }
  const result = await pool.query(
    'SELECT id, name, email, role, is_active, must_change_password FROM users WHERE id = $1',
    [req.session.userId]
  );
  const user = result.rows[0];
  if (!user || !user.is_active) {
    res.status(401).json({ error: 'Not logged in.' });
    return null;
  }
  delete user.is_active; // always true here, so no need to send it around
  return user;
}

// "Middleware" runs before a route. This one only lets logged-in users through,
// and puts the current user on req.user so the route knows who is asking.
// Users with a temporary password are blocked until they change it.
export async function requireLogin(req, res, next) {
  const user = await loadActiveUser(req, res);
  if (!user) return;
  if (user.must_change_password) {
    return res.status(403).json({ error: 'Please change your temporary password first.' });
  }
  req.user = user;
  next(); // continue to the actual route
}

// Same, but also lets through users who still have a temporary password.
// Only for /me and change-password: the two things such a user is allowed to do.
export async function requireLoginAllowingPasswordChange(req, res, next) {
  const user = await loadActiveUser(req, res);
  if (!user) return;
  req.user = user;
  next();
}
