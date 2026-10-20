import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import CourseCard from '../components/CourseCard.jsx';
import { StudentProgress, TeachingSummary } from '../components/CourseProgress.jsx';

// "Courses" in the sidebar: only the courses I have access to (enrolled or teaching).
export default function MyCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role === 'admin') return;
    api('/api/courses/mine')
      .then((body) => setCourses(body.courses))
      .catch((err) => setError(err.message));
  }, [user.role]);

  // Admins manage courses on their own page; they aren't in any course.
  if (user.role === 'admin') {
    return <Navigate to="/admin/courses" replace />;
  }

  const isStudent = user.role === 'student';
  return (
    <main className="page">
      <h1>Courses</h1>
      <p className="muted">{isStudent ? 'The courses you’re enrolled in.' : 'The courses you teach.'}</p>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!courses && !error && <p className="muted">Loading…</p>}
      {courses && courses.length === 0 && <p className="muted">You have no courses yet.</p>}

      {courses && courses.length > 0 && (
        <ul className="course-grid">
          {courses.map((course, index) => (
            <li key={course.id}>
              <CourseCard course={course} index={index} to={`/courses/${course.id}`}>
                <p className="small">{course.description}</p>
                <p className="muted small">{course.instructor_name}</p>
                {isStudent ? <StudentProgress course={course} /> : <TeachingSummary course={course} />}
              </CourseCard>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
