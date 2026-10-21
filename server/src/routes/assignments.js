import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { requireRole } from '../middleware/requireRole.js';
import { findAccessibleAssignment, findTaughtCourse, isValidId } from '../access.js';
import { checkAssignmentInput } from '../assignmentInput.js';
import { cleanFileName, deleteStoredFile, handleTextFieldsOnly, handleUpload } from '../uploads.js';

const router = Router();

// The details of a submission that are safe to send to the browser (no stored_name).
const SUBMISSION_FIELDS =
  's.id, s.file_name, s.file_size, s.text_body, s.url, s.submitted_at, s.score, s.feedback, s.graded_at';

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

// PUT /api/assignments/:id — edit an assignment. Only the instructor who TEACHES its course.
router.put('/:id', requireLogin, requireRole('instructor'), async (req, res) => {
  const assignment = isValidId(req.params.id) && (await findAccessibleAssignment(req.params.id, req.user.id));
  if (!assignment || !(await findTaughtCourse(assignment.course_id, req.user.id))) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }
  const { error, values } = checkAssignmentInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  // Points can't drop below a grade already given: a 9/10 must not turn into 9/5.
  const highest = await pool.query('SELECT max(score) AS score FROM submissions WHERE assignment_id = $1', [
    assignment.id,
  ]);
  const highestScore = highest.rows[0].score;
  const newPoints = values[3];
  if (highestScore !== null && newPoints < highestScore) {
    return res.status(400).json({
      error: `Points can't be lower than a grade already given (${highestScore}).`,
    });
  }

  await pool.query(
    'UPDATE assignments SET title = $1, description = $2, due_at = $3, points = $4, allowed_types = $5 WHERE id = $6',
    [...values, assignment.id]
  );
  res.json({ assignment: await findAccessibleAssignment(assignment.id, req.user.id) });
});

const MAX_TEXT_LENGTH = 20000;
const MAX_URL_LENGTH = 2000;

// Only real web links. "javascript:alert(1)" or "data:..." links RUN CODE when clicked,
// so anything that isn't http:// or https:// is refused.
function isSafeWebLink(text) {
  try {
    const url = new URL(text);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '';
  } catch {
    return false; // not a valid URL at all
  }
}

// Runs BEFORE the upload, so files from people who aren't allowed never reach the disk.
async function checkCanSubmit(req, res, next) {
  const assignment = isValidId(req.params.id) && (await findAccessibleAssignment(req.params.id, req.user.id));
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }
  const existing = await pool.query(
    `SELECT file_name, stored_name, file_type, file_size, score
     FROM submissions WHERE assignment_id = $1 AND student_id = $2`,
    [assignment.id, req.user.id]
  );
  if (existing.rows[0] && existing.rows[0].score !== null) {
    return res.status(409).json({ error: 'This submission has been graded and can no longer be changed.' });
  }
  req.assignment = assignment;
  req.previous = existing.rows[0]; // undefined if this is the first submission
  next();
}

// Accept a file only if this assignment allows files; otherwise any file is refused before it's saved.
function uploadIfAllowed(req, res, next) {
  const step = req.assignment.allowed_types.includes('file') ? handleUpload : handleTextFieldsOnly;
  step(req, res, next);
}

// PUT /api/assignments/:id/submission — submit (or replace) my work. Students only.
// A multipart form with any of: "file", "text", "url", and "removeFile" = "true" to drop the current file.
// Each step must pass before the next one runs: logged in → student → allowed → upload → checks → database.
router.put(
  '/:id/submission',
  requireLogin,
  requireRole('student'),
  checkCanSubmit,
  uploadIfAllowed,
  async (req, res) => {
    const allowed = req.assignment.allowed_types;
    const fields = req.body ?? {};

    // If we say no after the upload step, the new file must not stay on disk.
    async function refuse(message) {
      if (req.file) await deleteStoredFile(req.file.filename);
      return res.status(400).json({ error: message });
    }

    // Text entry: empty means "no text". Line breaks from forms become plain "\n".
    const text = typeof fields.text === 'string' && fields.text.trim() ? fields.text.replace(/\r\n/g, '\n').trim() : null;
    if (text && !allowed.includes('text')) return refuse('This assignment doesn’t accept text entries.');
    if (text && text.length > MAX_TEXT_LENGTH) return refuse(`Text entries can be at most ${MAX_TEXT_LENGTH} characters.`);

    // Website link: empty means "no link".
    const url = typeof fields.url === 'string' && fields.url.trim() ? fields.url.trim() : null;
    if (url && !allowed.includes('url')) return refuse('This assignment doesn’t accept website links.');
    if (url && (url.length > MAX_URL_LENGTH || !isSafeWebLink(url))) {
      return refuse('Links must be a full web address starting with http:// or https://.');
    }

    // The file after this save: the new upload, or the one already there (unless it's being removed).
    const keptFile = fields.removeFile === 'true' ? null : req.previous?.stored_name ? req.previous : null;
    const file = req.file
      ? {
          file_name: cleanFileName(req.file.originalname),
          stored_name: req.file.filename,
          file_type: req.file.mimetype,
          file_size: req.file.size,
        }
      : keptFile;

    if (!file && !text && !url) {
      return refuse('Add a file, a text entry or a link.');
    }

    // "Upsert": insert a new submission, or replace the existing one (late submissions are allowed).
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, file_name, stored_name, file_type, file_size, text_body, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (assignment_id, student_id) DO UPDATE
         SET file_name = EXCLUDED.file_name, stored_name = EXCLUDED.stored_name,
             file_type = EXCLUDED.file_type, file_size = EXCLUDED.file_size,
             text_body = EXCLUDED.text_body, url = EXCLUDED.url, submitted_at = now()
       RETURNING ${SUBMISSION_FIELDS.replaceAll('s.', '')}`,
      [
        req.assignment.id,
        req.user.id,
        file?.file_name ?? null,
        file?.stored_name ?? null,
        file?.file_type ?? null,
        file?.file_size ?? null,
        text,
        url,
      ]
    );

    // If the old file was replaced or removed, delete it from disk.
    const oldStoredName = req.previous?.stored_name;
    if (oldStoredName && oldStoredName !== file?.stored_name) {
      await deleteStoredFile(oldStoredName);
    }
    res.json({ submission: result.rows[0] });
  }
);

export default router;
