import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CourseForm from '../components/CourseForm.jsx';

export default function AdminCoursePage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [studentToAdd, setStudentToAdd] = useState('');

  // useCallback keeps the same function between renders, so useEffect doesn't loop.
  const loadCourse = useCallback(async () => {
    const body = await api(`/api/admin/courses/${id}`);
    setCourse(body.course);
    setStudents(body.students);
  }, [id]);

  useEffect(() => {
    Promise.all([loadCourse(), api('/api/admin/users').then((body) => setUsers(body.users))]).catch((err) =>
      setError(err.message)
    );
  }, [loadCourse]);

  async function saveCourse(values) {
    setSaved(false);
    const body = await api(`/api/admin/courses/${id}`, { method: 'PUT', json: values });
    setCourse(body.course);
    setSaved(true);
  }

  async function changeEnrollment(userId, method) {
    setError('');
    try {
      await api(`/api/admin/courses/${id}/students/${userId}`, { method });
      await loadCourse();
      setStudentToAdd('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!course) {
    return (
      <main className="page">
        {error ? <p className="alert-error" role="alert">{error}</p> : <p className="muted">Loading…</p>}
        <Link to="/admin/courses">← Back to courses</Link>
      </main>
    );
  }

  const instructors = users.filter((u) => u.role === 'instructor' && u.is_active);
  const enrolledIds = new Set(students.map((s) => s.id));
  const addableStudents = users.filter((u) => u.role === 'student' && u.is_active && !enrolledIds.has(u.id));

  return (
    <main className="page">
      <Link to="/admin/courses">← Back to courses</Link>
      <header className="course-header">
        <span className="course-code">{course.code}</span>
        <h1>{course.title}</h1>
      </header>

      <section className="card admin-section">
        <h2>Course details</h2>
        {saved && <p className="notice" role="status">Saved.</p>}
        {/* key: rebuild the form when the instructor list arrives, so the select shows the right choice */}
        <CourseForm
          key={instructors.length}
          initial={{
            code: course.code,
            title: course.title,
            description: course.description,
            instructorId: course.instructor_id,
          }}
          instructors={instructors}
          submitLabel="Save changes"
          onSave={saveCourse}
        />
      </section>

      <section className="card">
        <h2>Students ({students.length})</h2>
        {error && <p className="alert-error" role="alert">{error}</p>}

        <form
          className="enroll-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (studentToAdd) changeEnrollment(studentToAdd, 'PUT');
          }}
        >
          <label htmlFor="add-student" className="visually-hidden">Student to enroll</label>
          <select id="add-student" value={studentToAdd} onChange={(e) => setStudentToAdd(e.target.value)}>
            <option value="">Choose a student to enroll…</option>
            {addableStudents.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" disabled={!studentToAdd}>Enroll</button>
        </form>

        {students.length === 0 ? (
          <p className="muted">No students enrolled yet.</p>
        ) : (
          <ul className="student-list">
            {students.map((s) => (
              <li key={s.id}>
                <span>
                  {s.name} <span className="muted small">{s.email}</span>
                  {!s.is_active && <span className="tag tag-past">Deactivated</span>}
                </span>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    if (window.confirm(`Remove ${s.name} from ${course.code}? Their submissions are kept.`)) {
                      changeEnrollment(s.id, 'DELETE');
                    }
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
