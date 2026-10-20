import { useState } from 'react';

// The course form, shared by "Create course" and "Edit course".
// initial: the starting values; instructors: who can be chosen; onSave: called with the form values.
export default function CourseForm({ initial, instructors, submitLabel, onSave }) {
  const [code, setCode] = useState(initial.code);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [instructorId, setInstructorId] = useState(initial.instructorId);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!code.trim() || !title.trim()) return setError('Code and title are required.');
    if (!instructorId) return setError('Please choose an instructor.');

    setSaving(true);
    try {
      await onSave({ code, title, description, instructorId: Number(instructorId) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="course-code">Code</label>
          <input id="course-code" value={code} placeholder="e.g. CS 102" onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="course-title">Title</label>
          <input id="course-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="course-instructor">Instructor</label>
          <select id="course-instructor" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
            <option value="">Choose…</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="course-description">Description</label>
        <textarea
          id="course-description"
          rows="2"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
