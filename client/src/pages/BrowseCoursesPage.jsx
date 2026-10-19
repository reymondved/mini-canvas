import { Link } from 'react-router-dom';
import demoCourses from '../data/demoCourses.js';

export default function BrowseCoursesPage() {
  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Browse courses</h1>
          <p className="muted">Demo course catalog. Sign in to see your enrolled courses.</p>
        </div>
        <Link to="/login" className="btn btn-primary">Sign in</Link>
      </header>

      {/* .map() turns each course object into a card on the page */}
      <ul className="course-grid">
        {demoCourses.map((course) => (
          <li key={course.code} className="card course-card">
            <span className="course-code">{course.code}</span>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <p className="muted">{course.instructor}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
