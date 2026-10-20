// Shared pieces for announcements, used by the course routes, the admin routes and the announcement routes.
import { pool } from './db.js';

// What we send to the browser for each announcement (an = announcements, u = author, c = course).
// LEFT JOIN on courses: site-wide announcements have no course, and we still want them.
export const ANNOUNCEMENT_SELECT = `
  SELECT an.id, an.course_id, c.code AS course_code, an.title, an.body,
         an.created_at, an.edited_at, an.author_id, u.name AS author_name
  FROM announcements an
  JOIN users u ON u.id = an.author_id
  LEFT JOIN courses c ON c.id = an.course_id`;

export async function findAnnouncement(id) {
  const result = await pool.query(`${ANNOUNCEMENT_SELECT} WHERE an.id = $1`, [id]);
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

// Saves a new announcement. courseId = null means site-wide.
export async function createAnnouncement(courseId, authorId, [title, text]) {
  const result = await pool.query(
    'INSERT INTO announcements (course_id, author_id, title, body) VALUES ($1, $2, $3, $4) RETURNING id',
    [courseId, authorId, title, text]
  );
  return findAnnouncement(result.rows[0].id);
}
