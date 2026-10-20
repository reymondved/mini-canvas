import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { formatDate, submissionStatus } from '../format.js';

// Total = points earned on GRADED assignments / points possible on those assignments.
function courseTotal(assignments) {
  const graded = assignments.filter((a) => a.score !== null);
  const earned = graded.reduce((sum, a) => sum + a.score, 0);
  const possible = graded.reduce((sum, a) => sum + a.points, 0);
  return { earned, possible, percent: possible > 0 ? Math.round((earned / possible) * 100) : null };
}

export default function GradesPage() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/grades')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setCourses(body.courses);
      })
      .catch((err) => setError(err.message || 'Could not load your grades.'));
  }, []);

  return (
    <main className="page">
      <h1>Grades</h1>
      <p className="muted">Totals only count assignments that have been graded.</p>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!courses && !error && <p className="muted">Loading…</p>}
      {courses && courses.length === 0 && <p className="muted">You're not enrolled in any courses.</p>}

      {courses?.map((course) => {
        const total = courseTotal(course.assignments);
        return (
          <section key={course.id} className="card grades-course">
            <header className="grades-header">
              <h2>
                <span className="course-code">{course.code}</span> {course.title}
              </h2>
              <p className="grade-total">
                {total.percent === null ? 'No grades yet' : `${total.earned} / ${total.possible} (${total.percent}%)`}
              </p>
            </header>

            {/* A table, because this really is rows and columns of data */}
            <div className="table-wrap">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {course.assignments.map((a) => {
                    const status = submissionStatus(a);
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/assignments/${a.id}`}>{a.title}</Link>
                          {a.feedback && <p className="muted small">{a.feedback}</p>}
                        </td>
                        <td>{formatDate(a.due_at)}</td>
                        <td><span className={status.className}>{status.label}</span></td>
                        <td>{a.score !== null ? `${a.score} / ${a.points}` : `– / ${a.points}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </main>
  );
}
