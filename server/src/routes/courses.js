import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';

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
  // Course ids are whole numbers; anything else can't be a real course.
  if (!/^\d{1,9}$/.test(req.params.id)) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const courseResult = await pool.query(
    `SELECT c.id, c.code, c.title, c.description, u.name AS instructor_name
     FROM courses c
     JOIN users u ON u.id = c.instructor_id
     WHERE c.id = $1
       AND (c.instructor_id = $2
            OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = $2))`,
    [req.params.id, req.user.id]
  );
  const course = courseResult.rows[0];

  // Same answer for "doesn't exist" and "not yours", so nobody can probe which courses exist.
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }

  const assignmentsResult = await pool.query(
    `SELECT id, title, description, due_at, points
     FROM assignments
     WHERE course_id = $1
     ORDER BY due_at`,
    [course.id]
  );
  res.json({ course, assignments: assignmentsResult.rows });
});

export default router;
