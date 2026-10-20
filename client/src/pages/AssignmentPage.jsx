import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatDate, formatFileSize, isLate } from '../format.js';
import { api } from '../api.js';
import AssignmentForm from '../components/AssignmentForm.jsx';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // must match the server's limit
const ACCEPTED_FILES = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.zip';

export default function AssignmentPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null); // { assignment, submission } or { assignment, submissions }
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  // Instructor: save changes, then show the updated assignment.
  async function saveAssignment(values) {
    const body = await api(`/api/assignments/${id}`, { method: 'PUT', json: values });
    setData((current) => ({ ...current, assignment: body.assignment }));
    setEditing(false);
  }

  useEffect(() => {
    setData(null);
    setError('');
    fetch(`/api/assignments/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setData(body);
      })
      .catch((err) => setError(err.message || 'Could not load this assignment.'));
  }, [id]);

  if (error) {
    return (
      <main className="page">
        <p className="alert-error" role="alert">{error}</p>
        <Link to="/dashboard">← Back to dashboard</Link>
      </main>
    );
  }
  if (!data) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }

  const { assignment } = data;

  return (
    <main className="page">
      <Link to={`/courses/${assignment.course_id}`}>← Back to {assignment.course_code}</Link>
      {editing ? (
        <div className="course-header">
          <h1>Edit assignment</h1>
          <AssignmentForm
            initial={assignment}
            submitLabel="Save changes"
            onSave={saveAssignment}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <header className="course-header">
          <span className="course-code">{assignment.course_code}</span>
          <div className="section-header">
            <h1>{assignment.title}</h1>
            {user.role === 'instructor' && (
              <button type="button" className="btn btn-small" onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>
          <p className="muted">
            Due {formatDate(assignment.due_at)} · {assignment.points} pts
          </p>
          <p>{assignment.description}</p>
        </header>
      )}

      {user.role === 'student' ? (
        <StudentSubmission
          assignment={assignment}
          submission={data.submission}
          onSubmitted={(submission) => setData({ ...data, submission })}
        />
      ) : (
        <InstructorGrading assignment={assignment} submissions={data.submissions} />
      )}
    </main>
  );
}

// ---------- Student: see my submission, upload or replace it ----------

function StudentSubmission({ assignment, submission, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const graded = submission && submission.score !== null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!file) return setError('Please choose a file.');
    if (file.size > MAX_FILE_SIZE) return setError('File is too large (max 5 MB).');

    // FormData is how browsers send files: like a form with a file attached.
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/submission`, {
        method: 'PUT',
        body: formData, // no Content-Type header: the browser sets it for files
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      onSubmitted(body.submission);
      setFile(null);
      event.target.reset(); // clear the file picker
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card">
      <h2>Your submission</h2>

      {submission ? (
        <div className="submission">
          <p>
            <a href={`/api/submissions/${submission.id}/file`}>{submission.file_name}</a>{' '}
            <span className="muted">({formatFileSize(submission.file_size)})</span>
          </p>
          <p className="muted">
            Submitted {formatDate(submission.submitted_at)}{' '}
            {isLate(submission.submitted_at, assignment.due_at) && <span className="tag tag-late">Late</span>}
          </p>
          {graded && (
            <div className="grade-result">
              <p className="grade-score">{submission.score} / {assignment.points}</p>
              {submission.feedback && <p><strong>Feedback:</strong> {submission.feedback}</p>}
            </div>
          )}
        </div>
      ) : (
        <p className="muted">You haven't submitted anything yet.</p>
      )}

      {graded ? (
        <p className="muted">This assignment has been graded, so it can't be changed.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="file">{submission ? 'Replace your file' : 'Upload your file'}</label>
            <input
              id="file"
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(e) => setFile(e.target.files[0] ?? null)}
            />
            <p className="muted small">PDF, Word (.docx), text, PNG, JPG or ZIP · max 5 MB</p>
          </div>
          {error && <p className="alert-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Submit'}
          </button>
        </form>
      )}
    </section>
  );
}

// ---------- Instructor: every enrolled student, with a grade form for each submission ----------

function InstructorGrading({ assignment, submissions }) {
  return (
    <section>
      <h2>Submissions</h2>
      {submissions.length === 0 && <p className="muted">No students are enrolled in this course.</p>}
      <ul className="assignment-list">
        {submissions.map((s) => (
          <li key={s.student_id} className="card">
            <h3>{s.student_name}</h3>
            {s.id ? (
              <>
                <p>
                  <a href={`/api/submissions/${s.id}/file`}>{s.file_name}</a>{' '}
                  <span className="muted">({formatFileSize(s.file_size)})</span>
                </p>
                <p className="muted">
                  Submitted {formatDate(s.submitted_at)}{' '}
                  {isLate(s.submitted_at, assignment.due_at) && <span className="tag tag-late">Late</span>}
                </p>
                <GradeForm submission={s} points={assignment.points} />
              </>
            ) : (
              <p className="muted">Not submitted.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Each student's form keeps its own state, so typing in one doesn't affect the others.
function GradeForm({ submission, points }) {
  const [score, setScore] = useState(submission.score ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [gradedAt, setGradedAt] = useState(submission.graded_at);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const number = Number(score);
    if (score === '' || !Number.isInteger(number) || number < 0 || number > points) {
      return setError(`Enter a whole number from 0 to ${points}.`);
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/submissions/${submission.id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: number, feedback }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setGradedAt(body.submission.graded_at);
    } catch (err) {
      setError(err.message || 'Could not save the grade.');
    } finally {
      setSaving(false);
    }
  }

  const scoreId = `score-${submission.id}`;
  const feedbackId = `feedback-${submission.id}`;

  return (
    <form className="grade-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={scoreId}>Score (out of {points})</label>
        <input
          id={scoreId}
          type="number"
          min="0"
          max={points}
          step="1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={feedbackId}>Feedback (optional)</label>
        <textarea
          id={feedbackId}
          rows="3"
          maxLength={2000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <div className="grade-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : gradedAt ? 'Update grade' : 'Save grade'}
        </button>
        {gradedAt && <span className="tag tag-done">Graded {formatDate(gradedAt)}</span>}
      </div>
    </form>
  );
}
