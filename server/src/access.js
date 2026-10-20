import { pool } from './db.js';

// THE rule for who may open a course, written once and reused everywhere:
// you teach it, or you're enrolled in it. ($2 is always the user's id.)
const CAN_OPEN_COURSE = `(c.instructor_id = $2
  OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = $2))`;

// Ids in URLs are whole numbers; anything else can't be a real row.
export function isValidId(value) {
  return /^\d{1,9}$/.test(value);
}

// Returns the course (everything its About tab needs) if this user may open it, otherwise undefined.
// The syllabus file's disk name is NOT included: it stays on the server.
export async function findAccessibleCourse(courseId, userId) {
  const result = await pool.query(
    `SELECT c.id, c.code, c.title, c.description, c.instructor_id, u.name AS instructor_name,
            c.syllabus, c.syllabus_file_name, c.syllabus_file_size,
            (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id) AS student_count
     FROM courses c
     JOIN users u ON u.id = c.instructor_id
     WHERE c.id = $1 AND ${CAN_OPEN_COURSE}`,
    [courseId, userId]
  );
  return result.rows[0];
}

// Returns the course if this user TEACHES it, otherwise undefined.
// Stricter than "may open": changing a course's content needs this.
export async function findTaughtCourse(courseId, userId) {
  const result = await pool.query('SELECT id FROM courses WHERE id = $1 AND instructor_id = $2', [
    courseId,
    userId,
  ]);
  return result.rows[0];
}

// Returns the assignment (with its course) if this user may open its course, otherwise undefined.
export async function findAccessibleAssignment(assignmentId, userId) {
  const result = await pool.query(
    `SELECT a.id, a.course_id, a.title, a.description, a.due_at, a.points,
            c.code AS course_code, c.title AS course_title
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     WHERE a.id = $1 AND ${CAN_OPEN_COURSE}`,
    [assignmentId, userId]
  );
  return result.rows[0];
}
