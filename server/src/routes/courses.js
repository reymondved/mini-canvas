import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { findAccessibleCourse, isValidId } from '../access.js';

const router = Router();

// GET /api/courses — public catalog for the "Browse courses" page.
// JOIN combines rows from two tables: each course + the name of its instructor.
router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.code, c.title, c.description, u.name AS instructor_name
     FROM courses c
     JOIN users u ON u.id = c.instructor_id
     ORDER BY c.code`
  );
  res.json({ courses: result.rows });
});

// GET /api/courses/mine — students: courses they're enrolled in. Instructors: courses they teach.
router.get('/mine', requireLogin, async (req, res) => {
  const query =
    req.user.role === 'student'
      ? `SELECT c.id, c.code, c.title, c.description, u.name AS instructor_name
         FROM courses c
         JOIN users u ON u.id = c.instructor_id
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.user_id = $1
         ORDER BY c.code`
      : `SELECT c.id, c.code, c.title, c.description, u.name AS instructor_name
         FROM courses c
         JOIN users u ON u.id = c.instructor_id
         WHERE c.instructor_id = $1
         ORDER BY c.code`;
  const result = await pool.query(query, [req.user.id]);
  res.json({ courses: result.rows });
});

// GET /api/courses/:id — one course and its assignments,
// but ONLY if you teach it or are enrolled in it (this is "authorization").
router.get('/:id', requireLogin, async (req, res) => {
  const course = isValidId(req.params.id) && (await findAccessibleCourse(req.params.id, req.user.id));

  // Same answer for "doesn't exist" and "not yours", so nobody can probe which courses exist.
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  // LEFT JOIN keeps every assignment, even ones with no submission from this user.
  // For a student, submitted_at/score show their own progress; for an instructor they stay empty.
  const assignmentsResult = await pool.query(
    `SELECT a.id, a.title, a.description, a.due_at, a.points, s.submitted_at, s.score
     FROM assignments a
     LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $2
     WHERE a.course_id = $1
     ORDER BY a.due_at`,
    [course.id, req.user.id]
  );
  res.json({ course, assignments: assignmentsResult.rows });
});

export default router;
