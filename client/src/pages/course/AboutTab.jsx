import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { FileText, Paperclip, Pencil, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api.js';
import { formatFileSize } from '../../format.js';

const MAX_SYLLABUS_LENGTH = 20000; // must match the server
const ACCEPTED_FILES = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.zip';

// About: description, instructor, course code, number of students, and the syllabus.
export default function AboutTab() {
  const { course, setData } = useOutletContext();
  const { user } = useAuth();
  const canEdit = course.instructor_id === user.id;

  // The syllabus endpoints answer with the updated course; put it back into the shared course data.
  function updateCourse(updated) {
    setData((current) => ({ ...current, course: updated }));
  }

  return (
    <div className="tab-panel">
      <section className="card">
        <dl className="facts">
          <div>
            <dt>Course code</dt>
            <dd>{course.code}</dd>
          </div>
          <div>
            <dt>Instructor</dt>
            <dd>{course.instructor_name}</dd>
          </div>
          <div>
            <dt>Students</dt>
            <dd>{course.student_count}</dd>
          </div>
        </dl>
        <h2>Description</h2>
        <p className="prewrap">{course.description || 'No description yet.'}</p>
      </section>

      <Syllabus course={course} canEdit={canEdit} onUpdated={updateCourse} />
    </div>
  );
}

function Syllabus({ course, canEdit, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(course.syllabus);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Runs an action, shows its error if it fails, and keeps the buttons disabled meanwhile.
  async function run(action) {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const saveText = (event) => {
    event.preventDefault();
    run(async () => {
      const body = await api(`/api/courses/${course.id}/syllabus`, { method: 'PUT', json: { syllabus: text } });
      onUpdated(body.course);
      setEditing(false);
    });
  };

  const uploadFile = (event) => {
    event.preventDefault();
    if (!file) return setError('Please choose a file.');
    run(async () => {
      const form = new FormData();
      form.append('file', file);
      const body = await api(`/api/courses/${course.id}/syllabus/file`, { method: 'PUT', form });
      onUpdated(body.course);
      setFile(null);
      event.target.reset();
    });
  };

  const removeFile = () => {
    if (!window.confirm('Remove the syllabus file?')) return;
    run(async () => {
      await api(`/api/courses/${course.id}/syllabus/file`, { method: 'DELETE' });
      onUpdated({ ...course, syllabus_file_name: null, syllabus_file_size: null });
    });
  };

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <FileText size={22} aria-hidden="true" /> Syllabus
        </h2>
        {canEdit && !editing && (
          <button type="button" className="btn btn-small" onClick={() => { setText(course.syllabus); setEditing(true); }}>
            <Pencil size={14} aria-hidden="true" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveText} noValidate>
          <div className="field">
            <label htmlFor="syllabus-text">Syllabus text</label>
            <textarea
              id="syllabus-text"
              rows="12"
              maxLength={MAX_SYLLABUS_LENGTH}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save syllabus'}</button>
            <button type="button" className="btn btn-small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <p className="prewrap">{course.syllabus || 'No syllabus yet.'}</p>
      )}

      {course.syllabus_file_name && (
        <p className="attachment-line">
          <Paperclip size={16} aria-hidden="true" />
          <a href={`/api/courses/${course.id}/syllabus/file`}>{course.syllabus_file_name}</a>
          <span className="muted small">({formatFileSize(course.syllabus_file_size)})</span>
          {canEdit && (
            <button type="button" className="btn btn-small" onClick={removeFile} disabled={busy}>
              <Trash2 size={14} aria-hidden="true" /> Remove
            </button>
          )}
        </p>
      )}

      {canEdit && (
        <form className="syllabus-upload" onSubmit={uploadFile} noValidate>
          <label htmlFor="syllabus-file">{course.syllabus_file_name ? 'Replace the file' : 'Attach a file (optional)'}</label>
          <input id="syllabus-file" type="file" accept={ACCEPTED_FILES} onChange={(e) => setFile(e.target.files[0] ?? null)} />
          <button type="submit" className="btn btn-small" disabled={busy || !file}>
            <Upload size={14} aria-hidden="true" /> Upload
          </button>
        </form>
      )}

      {error && <p className="alert-error" role="alert">{error}</p>}
    </section>
  );
}
