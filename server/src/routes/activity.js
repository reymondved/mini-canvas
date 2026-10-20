// Study activity: a heatmap of the days a student SUBMITTED work, plus where their requirements stand.
// Only real submissions count; nothing like page views or time spent is tracked.
import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireTeachesCourse } from '../middleware/requireTeachesCourse.js';
import { isValidId } from '../access.js';

const router = Router();
export const ACTIVITY_DAYS = 84; // 12 weeks

// A "day" depends on where you are: 23:30 in Manila is already the next day in UTC.
// The browser sends its time zone (e.g. "Asia/Manila"); we only accept real zone names PostgreSQL knows.
async function readTimeZone(req, res) {
  const tz = req.query.tz ?? 'UTC';
  const known = typeof tz === 'string' && (await pool.query('SELECT 1 FROM pg_timezone_names WHERE name = $1', [tz]));
  if (!known || known.rowCount === 0) {
    res.status(400).json({ error: 'Unknown time zone.' });
    return null;
  }
  return tz;
}

// The activity of one student. courseId = null means "all my courses" (the student's own view);
// a number means "only this course" (what that course's instructor sees).
async function activityFor(studentId, courseId, tz) {
  // One row per day for the last 84 days, INCLUDING days with 0 submissions.
  // generate_series makes the list of days; the LEFT JOIN counts submissions on each one.
  const days = await pool.query(
    `WITH days AS (
       SELECT generate_series(
         (now() AT TIME ZONE $2)::date - ($4::int - 1),
         (now() AT TIME ZONE $2)::date,
         interval '1 day'
       )::date AS day
     )
     SELECT to_char(d.day, 'YYYY-MM-DD') AS date, count(s.id)::int AS count
     FROM days d
     LEFT JOIN submissions s
       ON (s.submitted_at AT TIME ZONE $2)::date = d.day
      AND s.student_id = $1
      AND ($3::int IS NULL OR s.assignment_id IN (SELECT id FROM assignments WHERE course_id = $3))
     GROUP BY d.day
     ORDER BY d.day`,
    [studentId, tz, courseId, ACTIVITY_DAYS]
  );

  // Requirements: every assignment in the student's courses (or in this one course).
  //   on time = submitted before the due date, late = after it, missing = past due and nothing submitted.
  const requirements = await pool.query(
    `SELECT
       count(*) FILTER (WHERE s.id IS NOT NULL AND s.submitted_at <= a.due_at)::int AS on_time,
       count(*) FILTER (WHERE s.id IS NOT NULL AND s.submitted_at > a.due_at)::int  AS late,
       count(*) FILTER (WHERE s.id IS NULL AND a.due_at < now())::int               AS missing
     FROM enrollments e
     JOIN assignments a ON a.course_id = e.course_id
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.user_id
     WHERE e.user_id = $1 AND ($2::int IS NULL OR e.course_id = $2)`,
    [studentId, courseId]
  );

  return { days: days.rows, requirements: requirements.rows[0] };
}

// GET /api/activity?tz=Asia/Manila — MY activity across all my courses. Students only.
router.get('/activity', requireLogin, requireRole('student'), async (req, res) => {
  const tz = await readTimeZone(req, res);
  if (!tz) return;
  res.json(await activityFor(req.user.id, null, tz));
});

// GET /api/courses/:id/students/:userId/activity?tz=... — one student's activity IN THIS COURSE.
// Only the course's instructor, and only for students enrolled in it.
router.get(
  '/courses/:id/students/:userId/activity',
  requireLogin,
  requireRole('instructor'),
  requireTeachesCourse,
  async (req, res) => {
    const enrolled =
      isValidId(req.params.userId) &&
      (await pool.query(
        `SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.user_id
         WHERE e.course_id = $1 AND e.user_id = $2`,
        [req.course.id, req.params.userId]
      ));
    const student = enrolled && enrolled.rows[0];
    if (!student) {
      return res.status(404).json({ error: 'Student not found in this course.' });
    }
    const tz = await readTimeZone(req, res);
    if (!tz) return;
    res.json({ student, ...(await activityFor(student.id, req.course.id, tz)) });
  }
);

export default router;
