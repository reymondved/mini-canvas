// Small helpers for showing data, shared by several pages.

// "Demo Student" → "DS", for round avatars.
export function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// "in 2 days", "tomorrow", "in 5 hours", "yesterday"... in the browser's language.
export function formatRelative(isoString) {
  const hours = Math.round((new Date(isoString) - new Date()) / (60 * 60 * 1000));
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return relative.format(Math.round(hours / 24), 'day');
}

// The browser's date-and-time picker (<input type="datetime-local">) works in LOCAL time, without a zone.
// toLocalInputValue: server date (UTC) → "2026-11-05T23:59" for the picker.
export function toLocalInputValue(isoString) {
  const date = new Date(isoString);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

// fromLocalInputValue: "2026-11-05T23:59" from the picker → full UTC date for the server.
export function fromLocalInputValue(value) {
  return new Date(value).toISOString(); // new Date() reads it as local time; toISOString() converts to UTC
}

export function formatFileSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isLate(submittedAt, dueAt) {
  return new Date(submittedAt) > new Date(dueAt);
}

// One status label for a student's assignment, plus the CSS class for its colored tag.
export function submissionStatus({ due_at, submitted_at, score }) {
  if (score !== null && score !== undefined) return { label: 'Graded', className: 'tag tag-done' };
  if (submitted_at) {
    return isLate(submitted_at, due_at)
      ? { label: 'Submitted late', className: 'tag tag-late' }
      : { label: 'Submitted', className: 'tag tag-done' };
  }
  if (new Date(due_at) < new Date()) return { label: 'Missing', className: 'tag tag-past' };
  return { label: 'Not submitted', className: 'tag' };
}
