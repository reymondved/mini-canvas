import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { Users } from 'lucide-react';
import { api } from '../../api.js';
import { initials } from '../../format.js';

// Everyone in the course. Emails only arrive for the course's instructor (the server decides).
export default function PeopleTab() {
  const { course } = useOutletContext();
  const [people, setPeople] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/courses/${course.id}/people`)
      .then((body) => setPeople(body.people))
      .catch((err) => setError(err.message));
  }, [course.id]);

  return (
    <div className="tab-panel">
      <section className="card">
        <div className="card-header">
          <h2>
            <Users size={22} aria-hidden="true" /> People {people && <span className="muted small">({people.length})</span>}
          </h2>
        </div>
        {error && <p className="alert-error" role="alert">{error}</p>}
        {!people && !error && <p className="muted">Loading…</p>}
        {people && (
          <ul className="people-list">
            {people.map((p) => (
              <li key={p.id}>
                <span className="avatar" aria-hidden="true">{initials(p.name)}</span>
                <span className="people-text">
                  <strong>{p.name}</strong>
                  {p.email && <span className="muted small">{p.email}</span>}
                </span>
                <span className={p.role === 'instructor' ? 'tag' : 'tag tag-soon'}>
                  {p.role === 'instructor' ? 'Instructor' : 'Student'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
