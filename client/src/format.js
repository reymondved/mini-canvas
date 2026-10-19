// Small helpers for showing data, shared by several pages.

export function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
