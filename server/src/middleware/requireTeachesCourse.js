import { findTaughtCourse, isValidId } from '../access.js';

// Only lets through the instructor who TEACHES the course in the URL (/:id). Puts it on req.course.
// Use after requireLogin. Runs BEFORE any upload step, so others' files never reach the disk.
export async function requireTeachesCourse(req, res, next) {
  const course = isValidId(req.params.id) && (await findTaughtCourse(req.params.id, req.user.id));
  if (!course) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  req.course = course;
  next();
}
