import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { api } from '../../api.js';
import { isLate } from '../../format.js';
import StudentGradesTable, { TotalText } from '../../components/StudentGradesTable.jsx';

// Students: their own grades in this course. The course's instructor: a gradebook.
// The server decides which one you get (view: 'student' or 'instructor').
export default function GradesTab() {
  const { course } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/courses/${course.id}/grades`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [course.id]);

  if (error) return <p className="alert-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div className="tab-panel">
      {data.view === 'student' ? (
        <section className="card">
          <header className="grades-header">
            <h2>My grades</h2>
            <p className="grade-total"><TotalText assignments={data.assignments} /></p>
          </header>
          <StudentGradesTable assignments={data.assignments} />
        </section>
      ) : (
        <Gradebook {...data} />
      )}
    </div>
  );
}

// Students down the side, assignments across the top, one cell per submission.
// Click a cell to open that assignment, where grading happens.
function Gradebook({ assignments, students, submissions }) {
  // Look up a cell quickly: "studentId-assignmentId" → submission
  const cells = new Map(submissions.map((s) => [`${s.student_id}-${s.assignment_id}`, s]));
  const now = new Date();

  if (students.length === 0) {
    return <section className="card"><h2>Gradebook</h2><p className="muted">No students enrolled yet.</p></section>;
  }

  return (
    <section className="card">
      <header className="grades-header">
        <h2>Gradebook</h2>
        <p className="muted small">Click a cell to open the assignment and grade it.</p>
      </header>
      <div className="table-wrap">
        <table className="gradebook">
          <thead>
            <tr>
              <th scope="col">Student</th>
              {assignments.map((a) => (
                <th key={a.id} scope="col">
                  <Link to={`/assignments/${a.id}`}>{a.title}</Link>
                  <span className="muted small"> / {a.points}</span>
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const graded = assignments
                .map((a) => ({ a, s: cells.get(`${student.id}-${a.id}`) }))
                .filter(({ s }) => s && s.score !== null);
              const earned = graded.reduce((sum, { s }) => sum + s.score, 0);
              const possible = graded.reduce((sum, { a }) => sum + a.points, 0);
              return (
                <tr key={student.id}>
                  <th scope="row">{student.name}</th>
                  {assignments.map((a) => {
                    const s = cells.get(`${student.id}-${a.id}`);
                    return (
                      <td key={a.id}>
                        <Link to={`/assignments/${a.id}`} className="gradebook-cell">
                          {!s && (new Date(a.due_at) < now ? <span className="tag tag-past">Missing</span> : '–')}
                          {s && s.score !== null && <strong>{s.score}</strong>}
                          {s && s.score === null && (
                            <span className={isLate(s.submitted_at, a.due_at) ? 'tag tag-late' : 'tag'}>To grade</span>
                          )}
                        </Link>
                      </td>
                    );
                  })}
                  <td className="gradebook-total">
                    {possible > 0 ? `${earned} / ${possible} (${Math.round((earned / possible) * 100)}%)` : '–'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
