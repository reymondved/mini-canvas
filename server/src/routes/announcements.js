import { Router } from 'express';
import path from 'node:path';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { isValidId } from '../access.js';
import { UPLOAD_DIR, deleteStoredFile } from '../uploads.js';
import {
  announcementSelect,
  checkAnnouncementInput,
  findVisibleAnnouncement,
  visibleTo,
} from '../announcementData.js';

const router = Router();
const MAX_REPLY_LENGTH = 2000;

// GET /api/announcements — the latest announcements for ME: site-wide ones plus my courses'.
// Students: courses they're enrolled in. Instructors: courses they teach.
// Admins aren't in any course, so they only get site-wide ones (least privilege).
// Each one says whether *I* have read it (is_read).
router.get('/', requireLogin, async (req, res) => {
  const result = await pool.query(
    `${announcementSelect('$1')} WHERE ${visibleTo('$1')} ORDER BY an.created_at DESC LIMIT 20`,
    [req.user.id]
  );
  res.json({ announcements: result.rows });
});

// Loads the announcement in the URL if I may see it; otherwise answers 404. Used by many routes below.
async function loadVisible(req, res) {
  const announcement = isValidId(req.params.id) && (await findVisibleAnnouncement(req.params.id, req.user.id));
  if (!announcement) {
    res.status(404).json({ error: 'Announcement not found.' });
    return null;
  }
  return announcement;
}

// ---------- Edit and delete (author only) ----------

// PUT /api/announcements/:id — edit my announcement's text. It then shows "Edited <time>".
router.put('/:id', requireLogin, async (req, res) => {
  const announcement = await loadVisible(req, res);
  if (!announcement) return;
  if (announcement.author_id !== req.user.id) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }
  const { error, values } = checkAnnouncementInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  await pool.query('UPDATE announcements SET title = $1, body = $2, edited_at = now() WHERE id = $3', [
    ...values,
    announcement.id,
  ]);
  res.json({ announcement: await findVisibleAnnouncement(announcement.id, req.user.id) });
});

// DELETE /api/announcements/:id — delete my announcement, its replies and its files.
router.delete('/:id', requireLogin, async (req, res) => {
  const announcement = await loadVisible(req, res);
  if (!announcement) return;
  if (announcement.author_id !== req.user.id) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }
  // Remember the files' disk names first: deleting the row (CASCADE) removes their rows too.
  const files = await pool.query('SELECT stored_name FROM announcement_files WHERE announcement_id = $1', [
    announcement.id,
  ]);
  await pool.query('DELETE FROM announcements WHERE id = $1', [announcement.id]);
  await Promise.all(files.rows.map((f) => deleteStoredFile(f.stored_name)));
  res.status(204).end();
});

// ---------- Read / unread (each person has their own) ----------

// PUT /api/announcements/:id/read — mark as read FOR ME. Doing it twice is harmless.
router.put('/:id/read', requireLogin, async (req, res) => {
  const announcement = await loadVisible(req, res);
  if (!announcement) return;
  await pool.query(
    'INSERT INTO announcement_reads (user_id, announcement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, announcement.id]
  );
  res.status(204).end();
});

// DELETE /api/announcements/:id/read — mark as unread again FOR ME.
router.delete('/:id/read', requireLogin, async (req, res) => {
  const announcement = await loadVisible(req, res);
  if (!announcement) return;
  await pool.query('DELETE FROM announcement_reads WHERE user_id = $1 AND announcement_id = $2', [
    req.user.id,
    announcement.id,
  ]);
  res.status(204).end();
});

// ---------- Replies (course announcements only, visible to the whole course) ----------

// can_delete: true for the reply's author AND for the course's instructor (moderation).
const REPLY_SELECT = `
  SELECT rp.id, rp.body, rp.created_at, rp.author_id, u.name AS author_name, u.role AS author_role,
         (rp.author_id = $2 OR c.instructor_id = $2) AS can_delete
  FROM announcement_replies rp
  JOIN users u ON u.id = rp.author_id
  JOIN announcements an ON an.id = rp.announcement_id
  JOIN courses c ON c.id = an.course_id`;

// GET /api/announcements/:id/replies — oldest first.
router.get('/:id/replies', requireLogin, async (req, res) => {
  const announcement = await loadVisible(req, res);
  if (!announcement) return;
  const result = await pool.query(`${REPLY_SELECT} WHERE rp.announcement_id = $1 ORDER BY rp.created_at`, [
    announcement.id,
    req.user.id,
  ]);
  res.json({ replies: result.rows });
});

// POST /api/announcements/:id/replies — anyone in the course (its instructor and enrolled students).
router.post('/:id/replies', requireLogin, async (req, res) => {
  const announcement = await loadVisible(req, res);
  if (!announcement) return;
  if (announcement.course_id === null) {
    return res.status(400).json({ error: 'Site-wide announcements don’t take replies.' });
  }
  const { body } = req.body ?? {};
  if (typeof body !== 'string' || !body.trim() || body.length > MAX_REPLY_LENGTH) {
    return res.status(400).json({ error: `Reply must be 1 to ${MAX_REPLY_LENGTH} characters.` });
  }
  const created = await pool.query(
    'INSERT INTO announcement_replies (announcement_id, author_id, body) VALUES ($1, $2, $3) RETURNING id',
    [announcement.id, req.user.id, body.trim()]
  );
  const reply = await pool.query(`${REPLY_SELECT} WHERE rp.id = $1`, [created.rows[0].id, req.user.id]);
  res.status(201).json({ reply: reply.rows[0] });
});

// DELETE /api/announcements/replies/:replyId — the reply's author, or the course's instructor.
router.delete('/replies/:replyId', requireLogin, async (req, res) => {
  if (!isValidId(req.params.replyId)) {
    return res.status(404).json({ error: 'Reply not found.' });
  }
  const result = await pool.query(`${REPLY_SELECT} WHERE rp.id = $1`, [req.params.replyId, req.user.id]);
  const reply = result.rows[0];
  if (!reply || !reply.can_delete) {
    return res.status(404).json({ error: 'Reply not found.' });
  }
  await pool.query('DELETE FROM announcement_replies WHERE id = $1', [reply.id]);
  res.status(204).end();
});

// ---------- Attached files ----------

// GET /api/announcements/files/:fileId — download, only for people who may see the announcement.
router.get('/files/:fileId', requireLogin, async (req, res) => {
  if (!isValidId(req.params.fileId)) {
    return res.status(404).json({ error: 'File not found.' });
  }
  const result = await pool.query(
    `SELECT f.file_name, f.stored_name
     FROM announcement_files f
     JOIN announcements an ON an.id = f.announcement_id
     LEFT JOIN courses c ON c.id = an.course_id
     WHERE f.id = $1 AND ${visibleTo('$2')}`,
    [req.params.fileId, req.user.id]
  );
  const file = result.rows[0];
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }
  // Always a download (never opened inside our site), and no guessing a more dangerous file type.
  res.set('X-Content-Type-Options', 'nosniff');
  res.download(path.join(UPLOAD_DIR, file.stored_name), file.file_name);
});

export default router;
