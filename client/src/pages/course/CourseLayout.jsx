import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router';
import { api } from '../../api.js';

const TABS = [
  { to: 'about', label: 'About' },
  { to: 'announcements', label: 'Announcements' },
  { to: 'assignments', label: 'Assignments' },
  { to: 'modules', label: 'Modules' },
  { to: 'grades', label: 'Grades' },
  { to: 'people', label: 'People' },
];

// The frame of every course page: course header + tab bar, then the open tab (<Outlet />).
// The course is loaded ONCE here and handed to the tabs through the Outlet's "context",
// so switching tabs doesn't reload it. A tab reads it with useOutletContext().
export default function CourseLayout() {
  const { id } = useParams();
  const [data, setData] = useState(null); // { course, assignments }
  const [error, setError] = useState('');
  const tabsRef = useRef(null); // a "ref" points at a real element on the page
  const location = useLocation();

  // On phones the tab bar scrolls sideways; keep the open tab in view.
  useEffect(() => {
    tabsRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [location.pathname, data]);

  const reload = useCallback(() => {
    return api(`/api/courses/${id}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setData(null);
    setError('');
    reload();
  }, [reload]);

  if (error) {
    return (
      <main className="page">
        <p className="alert-error" role="alert">{error}</p>
        <Link to="/courses">← Back to courses</Link>
      </main>
    );
  }
  if (!data) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }

  const { course } = data;
  return (
    <main className="page">
      <Link to="/courses">← Courses</Link>
      <header className="course-header">
        <span className="course-code">{course.code}</span>
        <h1>{course.title}</h1>
        <p className="muted">{course.instructor_name}</p>
      </header>

      {/* Each tab is a link with its own URL, e.g. /courses/1/people */}
      <nav className="course-tabs" aria-label="Course sections" ref={tabsRef}>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className="course-tab">
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ ...data, setData, reload }} />
    </main>
  );
}
