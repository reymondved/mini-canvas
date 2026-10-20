import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import StudentGradesTable, { TotalText } from '../components/StudentGradesTable.jsx';

// All my grades, one card per course. (Each course's Grades tab shows the same table for that course.)
export default function GradesPage() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/grades')
      .then((body) => setCourses(body.courses))
      .catch((err) => setError(err.message || 'Could not load your grades.'));
  }, []);

  return (
    <main className="page">
      <h1>Grades</h1>
      <p className="muted">Totals only count assignments that have been graded.</p>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!courses && !error && <p className="muted">Loading…</p>}
      {courses && courses.length === 0 && <p className="muted">You're not enrolled in any courses.</p>}

      {courses?.map((course) => (
        <section key={course.id} className="card grades-course">
          <header className="grades-header">
            <h2>
              <span className="course-code">{course.code}</span>
              <Link to={`/courses/${course.id}/grades`}>{course.title}</Link>
            </h2>
            <p className="grade-total">
              <TotalText assignments={course.assignments} />
            </p>
          </header>
          <StudentGradesTable assignments={course.assignments} />
        </section>
      ))}
    </main>
  );
}
