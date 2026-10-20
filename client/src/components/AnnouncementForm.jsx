import { useState } from 'react';

// The form for posting or editing an announcement.
// initial: an announcement to edit, or undefined for a new one. onSave may throw an Error to show.
export default function AnnouncementForm({ initial, submitLabel, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!title.trim() || !body.trim()) return setError('Please write a title and a message.');

    setSaving(true);
    try {
      await onSave({ title, body });
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
