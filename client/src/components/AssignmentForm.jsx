import { useState } from 'react';
import { fromLocalInputValue, toLocalInputValue } from '../format.js';
import { SUBMISSION_TYPE_LABELS } from './SubmissionContent.jsx';

const MAX_POINTS = 1000; // must match the server

// The assignment form, shared by "New assignment" (course page) and "Edit" (assignment page).
// initial: an existing assignment to edit, or undefined for a new one.
// onSave: called with the values for the server; may throw an Error to show.
export default function AssignmentForm({ initial, submitLabel, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dueAt, setDueAt] = useState(initial ? toLocalInputValue(initial.due_at) : '');
  const [points, setPoints] = useState(initial?.points ?? '');
  const [allowedTypes, setAllowedTypes] = useState(initial?.allowed_types ?? ['file']);
  const [error, setError] = useState('');

  // Tick or untick one type, e.g. "text".
  function toggleType(type) {
    setAllowedTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));
  }
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const pointsNumber = Number(points);
    if (!title.trim()) return setError('Please enter a title.');
    if (!dueAt) return setError('Please choose a due date and time.');
    if (points === '' || !Number.isInteger(pointsNumber) || pointsNumber < 1 || pointsNumber > MAX_POINTS) {
      return setError(`Points must be a whole number from 1 to ${MAX_POINTS}.`);
    }
    if (allowedTypes.length === 0) return setError('Choose at least one way for students to submit.');

    setSaving(true);
    try {
      await onSave({ title, description, dueAt: fromLocalInputValue(dueAt), points: pointsNumber, allowedTypes });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card assignment-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="assignment-title">Title</label>
        <input id="assignment-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="assignment-description">Description</label>
        <textarea
          id="assignment-description"
          rows="3"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="assignment-due">Due date and time</label>
          <input
            id="assignment-due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="assignment-points">Points</label>
          <input
            id="assignment-points"
            type="number"
            min="1"
            max={MAX_POINTS}
            step="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
      </div>
      <fieldset className="choice-group">
        <legend>Students can submit</legend>
        {Object.entries(SUBMISSION_TYPE_LABELS).map(([type, label]) => (
          <label key={type} className="choice">
            <input type="checkbox" checked={allowedTypes.includes(type)} onChange={() => toggleType(type)} />
            {label}
          </label>
        ))}
      </fieldset>
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
