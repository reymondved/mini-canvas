import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import CourseForm from '../components/CourseForm.jsx';

const EMPTY_COURSE = { code: '', title: '', description: '', instructorId: '' };

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0); // changing the key gives a fresh, empty form

  useEffect(() => {
    // Promise.all runs both requests at the same time and waits for both.
    Promise.all([api('/api/admin/courses'), api('/api/admin/users')])
      .then(([courseBody, userBody]) => {
        setCourses(courseBody.courses);
        setInstructors(userBody.users.filter((u) => u.role === 'instructor' && u.is_active));
      })
      .catch((err) => setError(err.message));
  }, []);

  async function createCourse(values) {
    const body = await api('/api/admin/courses', { method: 'POST', json: values });
    setCourses((list) => [...list, body.course].sort((a, b) => a.code.localeCompare(b.code)));
    setFormKey((k) => k + 1);
  }

  return (
    <main className="page">
      <h1>Courses</h1>

      <section className="card admin-section">
        <h2>Create a course</h2>
        <CourseForm
          key={formKey}
          initial={EMPTY_COURSE}
          instructors={instructors}
          submitLabel="Create course"
          onSave={createCourse}
        />
      </section>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!courses && !error && <p className="muted">Loading…</p>}

      {courses && (
        <section className="card">
          <h2>All courses ({courses.length})</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Instructor</th>
                  <th>Students</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td><span className="course-code">{c.code}</span></td>
                    <td><Link to={`/admin/courses/${c.id}`}>{c.title}</Link></td>
                    <td>{c.instructor_name}</td>
                    <td>{c.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
