import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// GET /api/grades — every assignment in my courses, with my submission and score. Students only.
router.get('/', requireLogin, requireRole('student'), async (req, res) => {
  const result = await pool.query(
    `SELECT c.id AS course_id, c.code, c.title AS course_title,
            a.id, a.title, a.due_at, a.points,
            s.submitted_at, s.score, s.feedback
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     JOIN assignments a ON a.course_id = c.id
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.user_id
     WHERE e.user_id = $1
     ORDER BY c.code, a.due_at`,
    [req.user.id]
  );

  // The database returns one flat list; group it into courses → assignments for the page.
  const courses = [];
  for (const row of result.rows) {
    let course = courses.find((c) => c.id === row.course_id);
    if (!course) {
      course = { id: row.course_id, code: row.code, title: row.course_title, assignments: [] };
      courses.push(course);
    }
    course.assignments.push({
      id: row.id,
      title: row.title,
      due_at: row.due_at,
      points: row.points,
      submitted_at: row.submitted_at,
      score: row.score,
      feedback: row.feedback,
    });
  }
  res.json({ courses });
});

export default router;
