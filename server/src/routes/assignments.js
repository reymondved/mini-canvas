import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { findAccessibleAssignment, isValidId } from '../access.js';
import { cleanFileName, deleteStoredFile, handleUpload } from '../uploads.js';

const router = Router();

// The details of a submission that are safe to send to the browser (no stored_name).
const SUBMISSION_FIELDS = 's.id, s.file_name, s.file_size, s.submitted_at, s.score, s.feedback, s.graded_at';

// GET /api/assignments/:id
// Student → the assignment + their own submission. Instructor → the assignment + every enrolled student's submission.
router.get('/:id', requireLogin, async (req, res) => {
  const assignment = isValidId(req.params.id) && (await findAccessibleAssignment(req.params.id, req.user.id));
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  if (req.user.role === 'student') {
    const result = await pool.query(
      `SELECT ${SUBMISSION_FIELDS} FROM submissions s WHERE s.assignment_id = $1 AND s.student_id = $2`,
      [assignment.id, req.user.id]
    );
    return res.json({ assignment, submission: result.rows[0] ?? null });
  }

  // Instructor: list every enrolled student, with their submission if they have one.
  const result = await pool.query(
    `SELECT u.id AS student_id, u.name AS student_name, ${SUBMISSION_FIELDS}
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN submissions s ON s.student_id = u.id AND s.assignment_id = $1
     WHERE e.course_id = $2
     ORDER BY u.name`,
    [assignment.id, assignment.course_id]
  );
  res.json({ assignment, submissions: result.rows });
});

// Runs BEFORE the upload, so files from people who aren't allowed never reach the disk.
async function checkCanSubmit(req, res, next) {
  const assignment = isValidId(req.params.id) && (await findAccessibleAssignment(req.params.id, req.user.id));
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }
  const existing = await pool.query(
    'SELECT stored_name, score FROM submissions WHERE assignment_id = $1 AND student_id = $2',
    [assignment.id, req.user.id]
  );
  if (existing.rows[0] && existing.rows[0].score !== null) {
    return res.status(409).json({ error: 'This submission has been graded and can no longer be changed.' });
  }
  req.assignment = assignment;
  req.previousStoredName = existing.rows[0]?.stored_name;
  next();
}

// PUT /api/assignments/:id/submission — upload (or replace) my file. Students only.
// Each step must pass before the next one runs: logged in → student → allowed → file saved → database.
router.put('/:id/submission', requireLogin, requireRole('student'), checkCanSubmit, handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please choose a file to upload.' });
  }

  // "Upsert": insert a new submission, or replace the existing one (late submissions are allowed).
  const result = await pool.query(
    `INSERT INTO submissions (assignment_id, student_id, file_name, stored_name, file_type, file_size)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (assignment_id, student_id) DO UPDATE
       SET file_name = EXCLUDED.file_name, stored_name = EXCLUDED.stored_name,
           file_type = EXCLUDED.file_type, file_size = EXCLUDED.file_size, submitted_at = now()
     RETURNING id, file_name, file_size, submitted_at, score, feedback, graded_at`,
    [req.assignment.id, req.user.id, cleanFileName(req.file.originalname), req.file.filename, req.file.mimetype, req.file.size]
  );

  // The old file was replaced, so remove it from disk.
  if (req.previousStoredName) {
    await deleteStoredFile(req.previousStoredName);
  }
  res.json({ submission: result.rows[0] });
});

export default router;
