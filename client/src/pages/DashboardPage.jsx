import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null); // null = still loading
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/courses/mine')
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setCourses(data.courses))
      .catch(() => setError('Could not load your courses.'));
  }, []);

  const heading = user.role === 'instructor' ? 'Courses you teach' : 'My courses';

  return (
    <main className="page">
      <h1>{heading}</h1>
      <p className="muted">Welcome back, {user.name}.</p>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!courses && !error && <p className="muted">Loading…</p>}
      {courses && courses.length === 0 && <p className="muted">You have no courses yet.</p>}

      {courses && courses.length > 0 && (
        <ul className="course-grid">
          {courses.map((course) => (
            <li key={course.id}>
              <Link to={`/courses/${course.id}`} className="card course-card course-link">
                <span className="course-code">{course.code}</span>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
                <p className="muted">{course.instructor_name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
