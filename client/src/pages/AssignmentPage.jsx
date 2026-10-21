import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatDate, isLate } from '../format.js';
import { api } from '../api.js';
import AssignmentForm from '../components/AssignmentForm.jsx';
import SubmissionContent, { describeTypes } from '../components/SubmissionContent.jsx';

// These must match the server's limits
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 20000;
const MAX_URL_LENGTH = 2000;
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
      <Link to={`/courses/${assignment.course_id}/assignments`}>← Back to {assignment.course_code}</Link>
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
            Due {formatDate(assignment.due_at)} · {assignment.points} pts · Accepts:{' '}
            {describeTypes(assignment.allowed_types)}
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

// ---------- Student: see my submission, hand it in or change it ----------

function StudentSubmission({ assignment, submission, onSubmitted }) {
  const allows = (type) => assignment.allowed_types.includes(type);
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  // Text and link start with what was handed in before, so a resubmit keeps them unless changed.
  const [text, setText] = useState(submission?.text_body ?? '');
  const [url, setUrl] = useState(submission?.url ?? '');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const graded = submission && submission.score !== null;
  const hasFile = Boolean(submission?.file_name);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const keepsFile = hasFile && !removeFile;
    if (!file && !keepsFile && !text.trim() && !url.trim()) {
      return setError('Add a file, a text entry or a link before submitting.');
    }
    if (file && file.size > MAX_FILE_SIZE) return setError('File is too large (max 5 MB).');
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
      return setError('Links must start with http:// or https://');
    }

    // FormData is how browsers send files: like a form with a file (and text fields) attached.
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (removeFile) formData.append('removeFile', 'true');
    if (allows('text')) formData.append('text', text);
    if (allows('url')) formData.append('url', url);

    setUploading(true);
    try {
      const body = await api(`/api/assignments/${assignment.id}/submission`, { method: 'PUT', form: formData });
      onSubmitted(body.submission);
      setFile(null);
      setRemoveFile(false);
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
          <SubmissionContent submission={submission} />
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
          {allows('file') && (
            <div className="field">
              <label htmlFor="file">{hasFile ? 'Replace your file (optional)' : 'Upload a file'}</label>
              <input
                id="file"
                type="file"
                accept={ACCEPTED_FILES}
                onChange={(e) => setFile(e.target.files[0] ?? null)}
              />
              <p className="muted small">PDF, Word (.docx), text, PNG, JPG or ZIP · max 5 MB</p>
              {hasFile && !file && (
                <label className="choice">
                  <input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} />
                  Remove my current file ({submission.file_name})
                </label>
              )}
            </div>
          )}
          {allows('text') && (
            <div className="field">
              <label htmlFor="submission-text">Text entry</label>
              <textarea
                id="submission-text"
                rows="6"
                maxLength={MAX_TEXT_LENGTH}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          )}
          {allows('url') && (
            <div className="field">
              <label htmlFor="submission-url">Website link</label>
              <input
                id="submission-url"
                type="url"
                placeholder="https://"
                maxLength={MAX_URL_LENGTH}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="muted small">For example a link to your code, a video or a shared document.</p>
            </div>
          )}
          {error && <p className="alert-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Submitting…' : submission ? 'Update submission' : 'Submit'}
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
                <SubmissionContent submission={s} />
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
