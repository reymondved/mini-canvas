import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api.js';
import { formatDate, submissionStatus } from '../../format.js';
import AssignmentForm from '../../components/AssignmentForm.jsx';

// The course's assignments (same as the old course page). The instructor can add new ones.
export default function AssignmentsTab() {
  const { course, assignments, setData } = useOutletContext();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const isTeacher = course.instructor_id === user.id;
  const now = new Date();

  // Save a new assignment, then add it to the shared list (sorted by due date).
  async function createAssignment(values) {
    const body = await api(`/api/courses/${course.id}/assignments`, { method: 'POST', json: values });
    const newAssignment = { ...body.assignment, submitted_at: null, score: null };
    setData((current) => ({
      ...current,
      assignments: [...current.assignments, newAssignment].sort((a, b) => new Date(a.due_at) - new Date(b.due_at)),
    }));
    setShowForm(false);
  }

  return (
    <div className="tab-panel">
      <div className="section-header">
        <h2>Assignments</h2>
        {isTeacher && !showForm && (
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
    </div>
  );
}
