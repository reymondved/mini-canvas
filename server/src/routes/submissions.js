import { Router } from 'express';
import path from 'node:path';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { isValidId } from '../access.js';
import { UPLOAD_DIR } from '../uploads.js';

const router = Router();

// GET /api/submissions/:id/file — download a submitted file.
// Only the student who submitted it, or the instructor who teaches the course.
router.get('/:id/file', requireLogin, async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  const result = await pool.query(
    `SELECT s.file_name, s.stored_name
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE s.id = $1 AND (s.student_id = $2 OR c.instructor_id = $2)`,
    [req.params.id, req.user.id]
  );
  const file = result.rows[0];
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  // res.download always sends it as a download (never opened inside our site),
  // and "nosniff" stops the browser from guessing a different, more dangerous file type.
  res.set('X-Content-Type-Options', 'nosniff');
  res.download(path.join(UPLOAD_DIR, file.stored_name), file.file_name);
});

// PUT /api/submissions/:id/grade — instructors only, and only for courses they teach.
router.put('/:id/grade', requireLogin, requireRole('instructor'), async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Submission not found.' });
  }
  const result = await pool.query(
    `SELECT s.id, a.points
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE s.id = $1 AND c.instructor_id = $2`,
    [req.params.id, req.user.id]
  );
  const submission = result.rows[0];
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  // Check the grade on the server too: a whole number from 0 up to the assignment's points.
  const { score, feedback } = req.body ?? {};
  if (!Number.isInteger(score) || score < 0 || score > submission.points) {
    return res.status(400).json({ error: `Score must be a whole number from 0 to ${submission.points}.` });
  }
  if (feedback !== undefined && (typeof feedback !== 'string' || feedback.length > 2000)) {
    return res.status(400).json({ error: 'Feedback must be text of at most 2000 characters.' });
  }

  const updated = await pool.query(
    `UPDATE submissions
     SET score = $1, feedback = $2, graded_at = now()
     WHERE id = $3
     RETURNING id, file_name, file_size, submitted_at, score, feedback, graded_at`,
    [score, feedback?.trim() || null, submission.id]
  );
  res.json({ submission: updated.rows[0] });
});

export default router;
