import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Activity, BookOpen, ClipboardCheck, Megaphone, Mountain } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import Illustration from '../components/Illustration.jsx';
import ComingSoon from '../components/ComingSoon.jsx';
import CourseCard from '../components/CourseCard.jsx';
import DeadlineCalendar from '../components/DeadlineCalendar.jsx';
import UpcomingList from '../components/UpcomingList.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null); // null = still loading
  const [deadlines, setDeadlines] = useState([]);
  const [error, setError] = useState('');
  const isStudent = user.role === 'student';

  useEffect(() => {
    if (user.role === 'admin') return;
    api('/api/courses/mine')
      .then(async (body) => {
        setCourses(body.courses);
        // Deadlines for the calendar. Students: from the grades endpoint (all my assignments).
        // Instructors: from each course they teach.
        if (isStudent) {
          const grades = await api('/api/grades');
          setDeadlines(grades.courses.flatMap((c) => c.assignments));
        } else {
          const details = await Promise.all(body.courses.map((c) => api(`/api/courses/${c.id}`)));
          setDeadlines(details.flatMap((d) => d.assignments));
        }
      })
      .catch((err) => setError(err.message));
  }, [user.role, isStudent]);

  // Admins don't have courses of their own; their home is the Users page.
  if (user.role === 'admin') {
    return <Navigate to="/admin/users" replace />;
  }

  const firstName = user.name.split(' ')[0];

  return (
    <main className="page">
      <div className="dashboard">
        <div className="dashboard-main">
          <section className="welcome">
            <div>
              <p className="welcome-kicker">{isStudent ? 'Your learning space' : 'Your teaching space'}</p>
              <h1>Welcome back, {firstName}!</h1>
              <p>{isStudent ? 'Keep up your learning momentum.' : "Here's what's happening in your courses."}</p>
            </div>
            <Illustration />
          </section>

          {isStudent && (
            <ComingSoon icon={Activity} title="Study activity">
              A daily view of your study activity will appear here.
            </ComingSoon>
          )}

          <section className="card">
            <div className="card-header">
              <h2>
                <BookOpen size={22} aria-hidden="true" />
                {isStudent ? 'My courses' : 'Courses you teach'}
              </h2>
            </div>

            {error && <p className="alert-error" role="alert">{error}</p>}
            {!courses && !error && <p className="muted">Loading…</p>}
            {courses && courses.length === 0 && <p className="muted">You have no courses yet.</p>}

            {courses && courses.length > 0 && (
              <ul className="course-grid">
                {courses.map((course, index) => (
                  <li key={course.id}>
                    <CourseCard course={course} index={index} to={`/courses/${course.id}`}>
                      <p className="muted small">{course.instructor_name}</p>
                      {isStudent ? <StudentProgress course={course} /> : <TeachingSummary course={course} />}
                    </CourseCard>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ComingSoon icon={Megaphone} title="Announcements">
            Course news from your instructors will appear here.
          </ComingSoon>
        </div>

        <aside className="dashboard-side" aria-label="Schedule and tasks">
          <DeadlineCalendar deadlines={deadlines} />
          {isStudent ? <UpcomingList /> : <ToGradeList courses={courses} />}
          <section className="card motivation">
            <p>One small task today beats a big plan tomorrow.</p>
            <small>Keep going!</small>
            <Mountain size={96} aria-hidden="true" />
          </section>
        </aside>
      </div>
    </main>
  );
}

// "2 / 3 assignments submitted" + a progress bar. Real numbers from the server.
function StudentProgress({ course }) {
  const { assignment_count: total, submitted_count: done } = course;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <>
      <div className="course-card-stats">
        <span>
          {done} / {total} submitted
        </span>
        <span>{percent}%</span>
      </div>
      {/* role="progressbar" tells screen readers what this bar means */}
      <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${course.code} progress`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </>
  );
}

function TeachingSummary({ course }) {
  return (
    <div className="course-card-stats">
      <span>{course.assignment_count} assignments</span>
      {course.to_grade_count > 0 ? (
        <span className="tag tag-late">{course.to_grade_count} to grade</span>
      ) : (
        <span className="tag tag-done">All graded</span>
      )}
    </div>
  );
}

// Instructors: which courses have submissions waiting for a grade.
function ToGradeList({ courses }) {
  const waiting = (courses ?? []).filter((c) => c.to_grade_count > 0);
  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <ClipboardCheck size={22} aria-hidden="true" />
          To grade
        </h2>
      </div>
      {!courses && <p className="muted">Loading…</p>}
      {courses && waiting.length === 0 && <p className="muted">Everything is graded. 🎉</p>}
      <ul className="task-list">
        {waiting.map((c) => (
          <li key={c.id}>
            <Link to={`/courses/${c.id}`} className="task">
              <span className="date-badge" aria-hidden="true">
                <strong>{c.to_grade_count}</strong>
              </span>
              <span className="task-text">
                <span className="task-title">{c.title}</span>
                <span className="muted">
                  {c.to_grade_count} submission{c.to_grade_count === 1 ? '' : 's'} waiting
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
