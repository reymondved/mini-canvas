import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { findAccessibleCourse, findTaughtCourse, isValidId } from '../access.js';
import { checkAssignmentInput } from '../assignmentInput.js';

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
// Each course also has numbers for the dashboard's progress bars:
//   assignment_count — how many assignments the course has
//   submitted_count  — students: how many of those I've submitted
//   to_grade_count   — instructors: submissions still waiting for a grade
// (A "subquery" in parentheses counts rows for each course.)
router.get('/mine', requireLogin, async (req, res) => {
  const assignmentCount = '(SELECT count(*)::int FROM assignments a WHERE a.course_id = c.id) AS assignment_count';
  const query =
    req.user.role === 'student'
      ? `SELECT c.id, c.code, c.title, c.description, u.name AS instructor_name, ${assignmentCount},
                (SELECT count(*)::int FROM submissions s JOIN assignments a ON a.id = s.assignment_id
                 WHERE a.course_id = c.id AND s.student_id = $1) AS submitted_count
         FROM courses c
         JOIN users u ON u.id = c.instructor_id
         JOIN enrollments e ON e.course_id = c.id
         WHERE e.user_id = $1
         ORDER BY c.code`
      : `SELECT c.id, c.code, c.title, c.description, u.name AS instructor_name, ${assignmentCount},
                (SELECT count(*)::int FROM submissions s JOIN assignments a ON a.id = s.assignment_id
                 WHERE a.course_id = c.id AND s.score IS NULL) AS to_grade_count
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

// POST /api/courses/:id/assignments — add an assignment. Only the instructor who TEACHES this course.
// Checks in order: logged in → instructor → teaches this course → valid form → save.
router.post('/:id/assignments', requireLogin, requireRole('instructor'), async (req, res) => {
  const course = isValidId(req.params.id) && (await findTaughtCourse(req.params.id, req.user.id));
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  const { error, values } = checkAssignmentInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const result = await pool.query(
    `INSERT INTO assignments (course_id, title, description, due_at, points)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, course_id, title, description, due_at, points`,
    [course.id, ...values]
  );
  res.status(201).json({ assignment: result.rows[0] });
});

export default router;
