import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatDate, submissionStatus } from '../format.js';
import { api } from '../api.js';
import AssignmentForm from '../components/AssignmentForm.jsx';
import AnnouncementsPanel from '../components/AnnouncementsPanel.jsx';

export default function CoursePage() {
  const { user } = useAuth();
  // useParams reads the ":id" part of the URL, e.g. /courses/2 → id = "2"
  const { id } = useParams();
  const [data, setData] = useState(null); // { course, assignments } once loaded
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Instructor: save a new assignment, then add it to the list (sorted by due date).
  async function createAssignment(values) {
    const body = await api(`/api/courses/${id}/assignments`, { method: 'POST', json: values });
    const newAssignment = { ...body.assignment, submitted_at: null, score: null };
    setData((current) => ({
      ...current,
      assignments: [...current.assignments, newAssignment].sort((a, b) => new Date(a.due_at) - new Date(b.due_at)),
    }));
    setShowForm(false);
  }

  useEffect(() => {
    setData(null);
    setError('');
    fetch(`/api/courses/${id}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setData(body);
      })
      .catch((err) => setError(err.message || 'Could not load this course.'));
  }, [id]); // run again if the id in the URL changes

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

  const { course, assignments } = data;
  const now = new Date();

  return (
    <main className="page">
      <Link to="/dashboard">← Back to dashboard</Link>
      <header className="course-header">
        <span className="course-code">{course.code}</span>
        <h1>{course.title}</h1>
        <p className="muted">{course.description} · {course.instructor_name}</p>
      </header>

      {/* Only this course's instructor ever gets this page as an instructor, so they may post here */}
      <div className="page-section">
        <AnnouncementsPanel
          loadUrl={`/api/courses/${id}/announcements`}
          postUrl={user.role === 'instructor' ? `/api/courses/${id}/announcements` : undefined}
        />
      </div>

      <div className="section-header">
        <h2>Assignments</h2>
        {user.role === 'instructor' && !showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + New assignment
          </button>
        )}
      </div>
      {showForm && (
        <AssignmentForm submitLabel="Create assignment" onSave={createAssignment} onCancel={() => setShowForm(false)} />
      )}
      {assignments.length === 0 && <p className="muted">No assignments yet.</p>}
      <ul className="assignment-list">
        {assignments.map((a) => {
          const pastDue = new Date(a.due_at) < now;
          const status = submissionStatus(a);
          return (
            <li key={a.id} className="card assignment">
              <div>
                <h3><Link to={`/assignments/${a.id}`}>{a.title}</Link></h3>
                <p>{a.description}</p>
              </div>
              <div className="assignment-meta">
                <span className="muted">{pastDue ? 'Was due' : 'Due'} {formatDate(a.due_at)}</span>
                {user.role === 'student' && <span className={status.className}>{status.label}</span>}
                <span className="muted">
                  {a.score !== null ? `${a.score} / ${a.points}` : a.points} pts
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
