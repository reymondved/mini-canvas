import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

export const UPCOMING_DAYS = 7;

// Every assignment in MY courses that I haven't submitted yet. ($1 = my user id)
// The LEFT JOIN + "s.id IS NULL" trick means: keep only rows with NO matching submission.
const NOT_SUBMITTED = `
  SELECT a.id, a.title, a.due_at, a.points, c.id AS course_id, c.code AS course_code
  FROM enrollments e
  JOIN courses c ON c.id = e.course_id
  JOIN assignments a ON a.course_id = c.id
  LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.user_id
  WHERE e.user_id = $1 AND s.id IS NULL`;

// GET /api/upcoming — the student's to-do list. Students only.
// now() is the DATABASE's clock, so every student gets the same answer, whatever their computer's time.
router.get('/', requireLogin, requireRole('student'), async (req, res) => {
  const missing = await pool.query(
    `${NOT_SUBMITTED} AND a.due_at < now()
     ORDER BY a.due_at DESC`, // most recently missed first
    [req.user.id]
  );
  const upcoming = await pool.query(
    `${NOT_SUBMITTED} AND a.due_at >= now() AND a.due_at < now() + make_interval(days => $2)
     ORDER BY a.due_at`, // soonest first
    [req.user.id, UPCOMING_DAYS]
  );
  res.json({ days: UPCOMING_DAYS, missing: missing.rows, upcoming: upcoming.rows });
});

export default router;
