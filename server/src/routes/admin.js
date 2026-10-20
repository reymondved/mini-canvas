import { Router } from 'express';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { isValidId } from '../access.js';

const router = Router();

// EVERY route in this file: must be logged in AND an admin.
router.use(requireLogin, requireRole('admin'));

const ROLES = ['student', 'instructor', 'admin'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = '23505'; // PostgreSQL's error code for "this value already exists"

const USER_FIELDS = 'id, name, email, role, is_active, must_change_password, created_at';

// A random password like "kP7mWq3xRt9z", without look-alike characters (0/O, 1/l/I).
function makeTemporaryPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += letters[randomInt(letters.length)]; // randomInt is crypto-safe, unlike Math.random
  }
  return password;
}

// ---------- Users ----------

// GET /api/admin/users — everyone, including deactivated accounts.
router.get('/users', async (req, res) => {
  const result = await pool.query(`SELECT ${USER_FIELDS} FROM users ORDER BY id`);
  res.json({ users: result.rows });
});

// POST /api/admin/users — create a user with a temporary password (shown ONCE, never stored as text).
router.post('/users', async (req, res) => {
  const { name, email, role } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100) {
    return res.status(400).json({ error: 'Name is required (max 100 characters).' });
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be student, instructor or admin.' });
  }

  const temporaryPassword = makeTemporaryPassword();
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING ${USER_FIELDS}`,
      [name.trim(), email.trim().toLowerCase(), await bcrypt.hash(temporaryPassword, 12), role]
    );
    res.status(201).json({ user: result.rows[0], temporaryPassword });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    throw err;
  }
});

// PATCH /api/admin/users/:id — deactivate or reactivate. (Users are never deleted, so their history stays.)
router.patch('/users/:id', async (req, res) => {
  const { isActive } = req.body ?? {};
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'User not found.' });
  }
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be true or false.' });
  }
  // Stops an admin from locking themselves out (and maybe leaving no admins at all).
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "You can't deactivate or reactivate your own account." });
  }
  const result = await pool.query(`UPDATE users SET is_active = $1 WHERE id = $2 RETURNING ${USER_FIELDS}`, [
    isActive,
    req.params.id,
  ]);
  if (!result.rows[0]) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user: result.rows[0] });
});

// ---------- Courses ----------

const COURSE_FIELDS = `c.id, c.code, c.title, c.description, c.instructor_id, u.name AS instructor_name,
  (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id) AS student_count`;

// Checks the course form. Returns { error } or { values } ready for SQL.
async function checkCourseInput(body) {
  const { code, title, description, instructorId } = body ?? {};
  if (typeof code !== 'string' || !code.trim() || code.length > 20) {
    return { error: 'Course code is required (max 20 characters).' };
  }
  if (typeof title !== 'string' || !title.trim() || title.length > 200) {
    return { error: 'Title is required (max 200 characters).' };
  }
  if (typeof description !== 'string' || description.length > 2000) {
    return { error: 'Description must be text (max 2000 characters).' };
  }
  if (!Number.isInteger(instructorId)) {
    return { error: 'Please choose an instructor.' };
  }
  const instructor = await pool.query(
    "SELECT 1 FROM users WHERE id = $1 AND role = 'instructor' AND is_active",
    [instructorId]
  );
  if (!instructor.rows[0]) {
    return { error: 'The instructor must be an active instructor account.' };
  }
  return { values: [code.trim(), title.trim(), description.trim(), instructorId] };
}

async function findCourse(id) {
  const result = await pool.query(
    `SELECT ${COURSE_FIELDS} FROM courses c JOIN users u ON u.id = c.instructor_id WHERE c.id = $1`,
    [id]
  );
  return result.rows[0];
}

// GET /api/admin/courses — every course, with its instructor and number of students.
router.get('/courses', async (req, res) => {
  const result = await pool.query(
    `SELECT ${COURSE_FIELDS} FROM courses c JOIN users u ON u.id = c.instructor_id ORDER BY c.code`
  );
  res.json({ courses: result.rows });
});

// POST /api/admin/courses — create a course.
router.post('/courses', async (req, res) => {
  const { error, values } = await checkCourseInput(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await pool.query(
      'INSERT INTO courses (code, title, description, instructor_id) VALUES ($1, $2, $3, $4) RETURNING id',
      values
    );
    res.status(201).json({ course: await findCourse(result.rows[0].id) });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'A course with this code already exists.' });
    }
    throw err;
  }
});

// GET /api/admin/courses/:id — one course and its enrolled students.
// (Admins manage courses, but don't see assignments or grades: least privilege.)
router.get('/courses/:id', async (req, res) => {
  const course = isValidId(req.params.id) && (await findCourse(req.params.id));
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  const students = await pool.query(
    `SELECT u.id, u.name, u.email, u.is_active
     FROM enrollments e JOIN users u ON u.id = e.user_id
     WHERE e.course_id = $1
     ORDER BY u.name`,
    [course.id]
  );
  res.json({ course, students: students.rows });
});

// PUT /api/admin/courses/:id — edit a course.
router.put('/courses/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  const { error, values } = await checkCourseInput(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await pool.query(
      'UPDATE courses SET code = $1, title = $2, description = $3, instructor_id = $4 WHERE id = $5 RETURNING id',
      [...values, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    res.json({ course: await findCourse(req.params.id) });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'A course with this code already exists.' });
    }
    throw err;
  }
});

// PUT /api/admin/courses/:id/students/:userId — enroll a student (doing it twice is harmless).
router.put('/courses/:id/students/:userId', async (req, res) => {
  const course = isValidId(req.params.id) && (await findCourse(req.params.id));
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  const student = isValidId(req.params.userId)
    ? (await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'student'", [req.params.userId])).rows[0]
    : undefined;
  if (!student) {
    return res.status(400).json({ error: 'Only student accounts can be enrolled.' });
  }
  await pool.query(
    'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [student.id, course.id]
  );
  res.status(204).end();
});

// DELETE /api/admin/courses/:id/students/:userId — remove a student from a course.
// Their submissions and grades are KEPT (they'd come back if the student is enrolled again).
router.delete('/courses/:id/students/:userId', async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.userId)) {
    return res.status(404).json({ error: 'Enrollment not found.' });
  }
  const result = await pool.query('DELETE FROM enrollments WHERE course_id = $1 AND user_id = $2', [
    req.params.id,
    req.params.userId,
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Enrollment not found.' });
  }
  res.status(204).end();
});

export default router;
