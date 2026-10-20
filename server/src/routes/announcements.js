import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin } from '../middleware/requireLogin.js';
import { isValidId } from '../access.js';
import { ANNOUNCEMENT_SELECT, checkAnnouncementInput, findAnnouncement } from '../announcementData.js';

const router = Router();

// GET /api/announcements — the latest announcements for ME: site-wide ones plus my courses'.
// Students: courses they're enrolled in. Instructors: courses they teach.
// Admins aren't in any course, so they only get site-wide ones (least privilege).
router.get('/', requireLogin, async (req, res) => {
  const result = await pool.query(
    `${ANNOUNCEMENT_SELECT}
     WHERE an.course_id IS NULL
        OR c.instructor_id = $1
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = $1)
     ORDER BY an.created_at DESC
     LIMIT 20`,
    [req.user.id]
  );
  res.json({ announcements: result.rows });
});

// Only the person who wrote an announcement may change or delete it.
async function findOwnAnnouncement(req) {
  if (!isValidId(req.params.id)) return undefined;
  const announcement = await findAnnouncement(req.params.id);
  return announcement && announcement.author_id === req.user.id ? announcement : undefined;
}

// PUT /api/announcements/:id — edit my announcement. It then shows "Edited <time>".
router.put('/:id', requireLogin, async (req, res) => {
  const announcement = await findOwnAnnouncement(req);
  if (!announcement) {
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
  res.json({ announcement: await findAnnouncement(announcement.id) });
});

// DELETE /api/announcements/:id — delete my announcement (for posts made by mistake).
router.delete('/:id', requireLogin, async (req, res) => {
  const announcement = await findOwnAnnouncement(req);
  if (!announcement) {
    return res.status(404).json({ error: 'Announcement not found.' });
  }
  await pool.query('DELETE FROM announcements WHERE id = $1', [announcement.id]);
  res.status(204).end();
});

export default router;
