import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function BrowseCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null); // null = still loading
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/courses')
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setCourses(data.courses))
      .catch(() => setError('Could not load courses.'));
  }, []);

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Browse courses</h1>
          <p className="muted">Demo course catalog. Sign in to see your enrolled courses.</p>
        </div>
        {user ? (
          <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        ) : (
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        )}
      </header>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!courses && !error && <p className="muted">Loading…</p>}

      {/* .map() turns each course object into a card on the page */}
      {courses && (
        <ul className="course-grid">
          {courses.map((course) => (
            <li key={course.id} className="card course-card">
              <span className="course-code">{course.code}</span>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p className="muted">{course.instructor_name}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
