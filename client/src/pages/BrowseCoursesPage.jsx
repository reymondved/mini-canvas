import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import CourseCard from '../components/CourseCard.jsx';
import Logo from '../components/Logo.jsx';

// Public page: anyone can see the list of courses, logged in or not.
export default function BrowseCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null); // null = still loading
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/courses')
      .then((body) => setCourses(body.courses))
      .catch(() => setError('Could not load courses.'));
  }, []);

  return (
    <>
      <header className="public-header">
        <Link to={user ? '/dashboard' : '/login'} aria-label="Eng Academy home">
          <Logo />
        </Link>
        {user ? (
          <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        ) : (
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        )}
      </header>

      <main className="page">
        <div className="page-header">
          <div>
            <h1>Course catalog</h1>
            <p className="muted">All demo courses. Sign in to see the ones you're enrolled in.</p>
          </div>
        </div>

        {error && <p className="alert-error" role="alert">{error}</p>}
        {!courses && !error && <p className="muted">Loading…</p>}

        {/* .map() turns each course object into a card on the page */}
        {courses && (
          <ul className="course-grid">
            {courses.map((course, index) => (
              <li key={course.id}>
                <CourseCard course={course} index={index}>
                  <p className="small">{course.description}</p>
                  <p className="muted small">{course.instructor_name}</p>
                </CourseCard>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
