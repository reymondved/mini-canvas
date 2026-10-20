// The course home tabs that need their own data: syllabus (About), People and Grades.
// Mounted at /api/courses next to routes/courses.js.
import { Router } from 'express';
import path from 'node:path';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireTeachesCourse } from '../middleware/requireTeachesCourse.js';
import { findAccessibleCourse, isValidId } from '../access.js';
import { UPLOAD_DIR, cleanFileName, deleteStoredFile, handleUpload } from '../uploads.js';

const router = Router();
const MAX_SYLLABUS_LENGTH = 20000;

// Loads the course in the URL if I may open it; otherwise answers 404.
async function loadAccessibleCourse(req, res) {
  const course = isValidId(req.params.id) && (await findAccessibleCourse(req.params.id, req.user.id));
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return null;
  }
  return course;
}

// ---------- Syllabus (About tab) ----------

// PUT /api/courses/:id/syllabus — the instructor writes or edits the syllabus text.
router.put('/:id/syllabus', requireLogin, requireRole('instructor'), requireTeachesCourse, async (req, res) => {
  const { syllabus } = req.body ?? {};
  if (typeof syllabus !== 'string' || syllabus.length > MAX_SYLLABUS_LENGTH) {
    return res.status(400).json({ error: `Syllabus must be text (max ${MAX_SYLLABUS_LENGTH} characters).` });
  }
  await pool.query('UPDATE courses SET syllabus = $1 WHERE id = $2', [syllabus.trim(), req.course.id]);
  res.json({ course: await findAccessibleCourse(req.course.id, req.user.id) });
});

// PUT /api/courses/:id/syllabus/file — upload (or replace) the syllabus file. Same upload rules as submissions.
// Order: logged in → instructor → teaches it → save file → database.
router.put(
  '/:id/syllabus/file',
  requireLogin,
  requireRole('instructor'),
  requireTeachesCourse,
  handleUpload,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose a file to upload.' });
    }
    const old = await pool.query('SELECT syllabus_stored_name FROM courses WHERE id = $1', [req.course.id]);
    await pool.query(
      `UPDATE courses
       SET syllabus_file_name = $1, syllabus_stored_name = $2, syllabus_file_type = $3, syllabus_file_size = $4
       WHERE id = $5`,
      [cleanFileName(req.file.originalname), req.file.filename, req.file.mimetype, req.file.size, req.course.id]
    );
    // The old file was replaced, so remove it from disk.
    if (old.rows[0].syllabus_stored_name) {
      await deleteStoredFile(old.rows[0].syllabus_stored_name);
    }
    res.json({ course: await findAccessibleCourse(req.course.id, req.user.id) });
  }
);

// DELETE /api/courses/:id/syllabus/file — remove the syllabus file.
router.delete('/:id/syllabus/file', requireLogin, requireRole('instructor'), requireTeachesCourse, async (req, res) => {
  const old = await pool.query('SELECT syllabus_stored_name FROM courses WHERE id = $1', [req.course.id]);
  await pool.query(
    `UPDATE courses
     SET syllabus_file_name = NULL, syllabus_stored_name = NULL, syllabus_file_type = NULL, syllabus_file_size = NULL
     WHERE id = $1`,
    [req.course.id]
  );
  if (old.rows[0].syllabus_stored_name) {
    await deleteStoredFile(old.rows[0].syllabus_stored_name);
  }
  res.status(204).end();
});

// GET /api/courses/:id/syllabus/file — download it, for anyone who may open the course.
router.get('/:id/syllabus/file', requireLogin, async (req, res) => {
  const course = await loadAccessibleCourse(req, res);
  if (!course) return;
  const result = await pool.query('SELECT syllabus_file_name, syllabus_stored_name FROM courses WHERE id = $1', [
    course.id,
  ]);
  const file = result.rows[0];
  if (!file.syllabus_stored_name) {
    return res.status(404).json({ error: 'This course has no syllabus file.' });
  }
  res.set('X-Content-Type-Options', 'nosniff');
  res.download(path.join(UPLOAD_DIR, file.syllabus_stored_name), file.syllabus_file_name);
});

// ---------- People ----------

// GET /api/courses/:id/people — the instructor and enrolled students, for anyone in the course.
// Emails are only shown to the course's instructor: classmates see names and roles (least privilege).
router.get('/:id/people', requireLogin, async (req, res) => {
  const course = await loadAccessibleCourse(req, res);
  if (!course) return;
  const showEmails = course.instructor_id === req.user.id;
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role
     FROM users u
     WHERE u.id = $1
        OR u.id IN (SELECT e.user_id FROM enrollments e WHERE e.course_id = $2)
     ORDER BY (u.role = 'instructor') DESC, u.name`,
    [course.instructor_id, course.id]
  );
  const people = result.rows.map(({ email, ...person }) => (showEmails ? { ...person, email } : person));
  res.json({ people });
});

// ---------- Grades ----------

// GET /api/courses/:id/grades
//   Students: only THEIR OWN grades in this course.
//   The course's instructor: a gradebook (every enrolled student × every assignment).
router.get('/:id/grades', requireLogin, async (req, res) => {
  const course = await loadAccessibleCourse(req, res);
  if (!course) return;

  const assignments = await pool.query(
    'SELECT id, title, due_at, points FROM assignments WHERE course_id = $1 ORDER BY due_at',
    [course.id]
  );

  if (req.user.role === 'student') {
    const mine = await pool.query(
      `SELECT a.id, a.title, a.due_at, a.points, s.submitted_at, s.score, s.feedback
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $2
       WHERE a.course_id = $1
       ORDER BY a.due_at`,
      [course.id, req.user.id]
    );
    return res.json({ view: 'student', assignments: mine.rows });
  }

  // Only the instructor who teaches it reaches this point (findAccessibleCourse let them in as the teacher).
  const students = await pool.query(
    `SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.user_id
     WHERE e.course_id = $1 ORDER BY u.name`,
    [course.id]
  );
  // Only submissions from students who are STILL enrolled (removed students keep their work, but aren't listed).
  const submissions = await pool.query(
    `SELECT s.id, s.assignment_id, s.student_id, s.submitted_at, s.score
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN enrollments e ON e.user_id = s.student_id AND e.course_id = a.course_id
     WHERE a.course_id = $1`,
    [course.id]
  );
  res.json({
    view: 'instructor',
    assignments: assignments.rows,
    students: students.rows,
    submissions: submissions.rows,
  });
});

export default router;
