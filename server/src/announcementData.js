// Shared pieces for announcements, used by the course routes, the admin routes and the announcement routes.
import { pool } from './db.js';
import { cleanFileName, deleteStoredFile } from './uploads.js';

// THE rule for "may this user see this announcement?", written once:
// site-wide ones are for everyone; course ones for the course's instructor and enrolled students.
// userParam is the SQL placeholder holding the user's id, e.g. '$2'.
export function visibleTo(userParam) {
  return `(an.course_id IS NULL
    OR c.instructor_id = ${userParam}
    OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = an.course_id AND e.user_id = ${userParam}))`;
}

// What we send to the browser for each announcement (an = announcements, u = author, c = course),
// including things that depend on WHO is asking (is_read) and small summaries (reply_count, files).
// LEFT JOIN on courses: site-wide announcements have no course, and we still want them.
export function announcementSelect(userParam) {
  return `
  SELECT an.id, an.course_id, c.code AS course_code, an.title, an.body,
         an.created_at, an.edited_at, an.author_id, u.name AS author_name,
         EXISTS (SELECT 1 FROM announcement_reads r
                 WHERE r.announcement_id = an.id AND r.user_id = ${userParam}) AS is_read,
         (SELECT count(*)::int FROM announcement_replies rp WHERE rp.announcement_id = an.id) AS reply_count,
         -- json_agg turns the attached files into one JSON list: [{ "id": 1, "file_name": "...", ... }]
         (SELECT coalesce(json_agg(json_build_object('id', f.id, 'file_name', f.file_name, 'file_size', f.file_size)
                                   ORDER BY f.id), '[]'::json)
          FROM announcement_files f WHERE f.announcement_id = an.id) AS files
  FROM announcements an
  JOIN users u ON u.id = an.author_id
  LEFT JOIN courses c ON c.id = an.course_id`;
}

// The announcement, if this user may see it; otherwise undefined.
export async function findVisibleAnnouncement(id, userId) {
  const result = await pool.query(`${announcementSelect('$2')} WHERE an.id = $1 AND ${visibleTo('$2')}`, [
    id,
    userId,
  ]);
  return result.rows[0];
}

// Checks the announcement form. Returns { error } or { values: [title, body] } ready for SQL.
// The text is stored exactly as typed. It's NOT cleaned of "<script>" here: it doesn't need to be,
// because React always shows it as plain text, never as HTML.
export function checkAnnouncementInput(body) {
  const { title, body: text } = body ?? {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200) {
    return { error: 'Title is required (max 200 characters).' };
  }
  if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
    return { error: 'Message is required (max 5000 characters).' };
  }
  return { values: [title.trim(), text.trim()] };
}

// Route handler step for "post an announcement" (course or site-wide), used AFTER the upload step.
// courseId = null means site-wide.
export async function postAnnouncement(req, res, courseId) {
  const files = req.files ?? [];
  const { error, values } = checkAnnouncementInput(req.body);
  if (error) {
    // The files were already saved by the upload step, so clean them up before saying no.
    await Promise.all(files.map((f) => deleteStoredFile(f.filename)));
    return res.status(400).json({ error });
  }

  // A TRANSACTION: the announcement, its files and the author's "read" mark are saved
  // all together or not at all. If anything fails halfway, ROLLBACK undoes the rest.
  const client = await pool.connect();
  let id;
  try {
    await client.query('BEGIN');
    const created = await client.query(
      'INSERT INTO announcements (course_id, author_id, title, body) VALUES ($1, $2, $3, $4) RETURNING id',
      [courseId, req.user.id, ...values]
    );
    id = created.rows[0].id;
    for (const f of files) {
      await client.query(
        `INSERT INTO announcement_files (announcement_id, file_name, stored_name, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, cleanFileName(f.originalname), f.filename, f.mimetype, f.size]
      );
    }
    // You've obviously read your own announcement.
    await client.query('INSERT INTO announcement_reads (user_id, announcement_id) VALUES ($1, $2)', [req.user.id, id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    await Promise.all(files.map((f) => deleteStoredFile(f.filename)));
    throw err;
  } finally {
    client.release(); // give the connection back to the pool
  }

  res.status(201).json({ announcement: await findVisibleAnnouncement(id, req.user.id) });
}
