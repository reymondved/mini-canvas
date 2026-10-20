// Checks the assignment form (used by both "create" and "edit").
// Returns { error } or { values: [title, description, dueAt, points] } ready for SQL.

export const MAX_POINTS = 1000;

// A date and time WITH a time zone, e.g. "2026-11-05T15:59:00.000Z" or "2026-11-05T23:59:00+08:00".
// Without a zone, "23:59" is ambiguous: 23:59 in Manila is a different moment than 23:59 in London.
const ISO_DATE_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function checkAssignmentInput(body) {
  const { title, description, dueAt, points } = body ?? {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200) {
    return { error: 'Title is required (max 200 characters).' };
  }
  if (typeof description !== 'string' || description.length > 2000) {
    return { error: 'Description must be text (max 2000 characters).' };
  }
  if (typeof dueAt !== 'string' || !ISO_DATE_WITH_ZONE.test(dueAt) || Number.isNaN(Date.parse(dueAt))) {
    return { error: 'Due date must be a valid date and time.' };
  }
  if (!Number.isInteger(points) || points < 1 || points > MAX_POINTS) {
    return { error: `Points must be a whole number from 1 to ${MAX_POINTS}.` };
  }
  return { values: [title.trim(), description.trim(), dueAt, points] };
}
