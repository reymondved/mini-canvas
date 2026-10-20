import { useState } from 'react';

// Must match the server's limits.
const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILES = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.zip';

// The form for posting or editing an announcement.
// initial: an announcement to edit, or undefined for a new one. onSave may throw an Error to show.
// Files can be attached when posting; editing only changes the text.
export default function AnnouncementForm({ initial, submitLabel, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isNew = !initial;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!title.trim() || !body.trim()) return setError('Please write a title and a message.');
    if (files.length > MAX_FILES) return setError(`Attach at most ${MAX_FILES} files.`);
    if (files.some((f) => f.size > MAX_FILE_SIZE)) return setError('Each file must be 5 MB or smaller.');

    setSaving(true);
    try {
      await onSave({ title, body, files });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // The ids include the announcement id, so two forms on one page never share a label.
  const idPrefix = `announcement-${initial?.id ?? 'new'}`;
  return (
    <form className="announcement-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>Title</label>
        <input id={`${idPrefix}-title`} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-body`}>Message</label>
        <textarea
          id={`${idPrefix}-body`}
          rows="4"
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {isNew ? (
        <div className="field">
          <label htmlFor={`${idPrefix}-files`}>Attach files (optional)</label>
          <input
            id={`${idPrefix}-files`}
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            onChange={(e) => setFiles([...e.target.files])}
          />
          <p className="muted small">Up to {MAX_FILES} files · PDF, Word, text, PNG, JPG or ZIP · max 5 MB each</p>
        </div>
      ) : (
        initial.files.length > 0 && (
          <p className="muted small">Attached files stay the same when you edit. To change them, post a new announcement.</p>
        )
      )}
      {error && <p className="alert-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-small" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
