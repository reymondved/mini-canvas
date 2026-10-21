// GET /api/search?q=... — find things you're ALLOWED to see.
// It reuses the same access rules as the rest of the app, so search can never show more than you could open.
import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { CAN_OPEN_COURSE } from '../access.js';
import { visibleTo } from '../announcementData.js';

const router = Router();
const MIN_LENGTH = 2;
const MAX_LENGTH = 100;
const LIMIT = 5; // per type, for the dropdown

// Turns "50%_off" into "%50\%\_off%" for ILIKE ("contains, ignoring capitals").
// In LIKE patterns % means "anything" and _ means "any one character", so we ESCAPE them
// with a backslash: a search for "%" should look for a real percent sign, not match everything.
function containsPattern(text) {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

router.get('/', requireLogin, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < MIN_LENGTH || q.length > MAX_LENGTH) {
    return res.status(400).json({ error: `Search for ${MIN_LENGTH} to ${MAX_LENGTH} characters.` });
  }
  const pattern = containsPattern(q);

  // Admins aren't in any course: they search the people and courses they manage.
  if (req.user.role === 'admin') {
    const [users, courses] = await Promise.all([
      pool.query(
        `SELECT id, name, email, role FROM users
         WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY name LIMIT ${LIMIT}`,
        [pattern]
      ),
      pool.query(
        `SELECT id, code, title FROM courses
         WHERE code ILIKE $1 OR title ILIKE $1 OR description ILIKE $1 ORDER BY code LIMIT ${LIMIT}`,
        [pattern]
      ),
    ]);
    return res.json({ users: users.rows, courses: courses.rows, assignments: [], announcements: [] });
  }

  // Students and instructors: only courses they can open, and what's inside them.
  // $1 = the pattern, $2 = my user id (CAN_OPEN_COURSE and visibleTo use $2).
  const [courses, assignments, announcements] = await Promise.all([
    pool.query(
      `SELECT c.id, c.code, c.title FROM courses c
       WHERE ${CAN_OPEN_COURSE} AND (c.code ILIKE $1 OR c.title ILIKE $1 OR c.description ILIKE $1)
       ORDER BY c.code LIMIT ${LIMIT}`,
      [pattern, req.user.id]
    ),
    pool.query(
      `SELECT a.id, a.title, a.due_at, c.code AS course_code FROM assignments a
       JOIN courses c ON c.id = a.course_id
       WHERE ${CAN_OPEN_COURSE} AND (a.title ILIKE $1 OR a.description ILIKE $1)
       ORDER BY a.due_at DESC LIMIT ${LIMIT}`,
      [pattern, req.user.id]
    ),
    pool.query(
      `SELECT an.id, an.title, an.created_at, c.code AS course_code FROM announcements an
       LEFT JOIN courses c ON c.id = an.course_id
       WHERE ${visibleTo('$2')} AND (an.title ILIKE $1 OR an.body ILIKE $1)
       ORDER BY an.created_at DESC LIMIT ${LIMIT}`,
      [pattern, req.user.id]
    ),
  ]);
  res.json({ users: [], courses: courses.rows, assignments: assignments.rows, announcements: announcements.rows });
});

export default router;
