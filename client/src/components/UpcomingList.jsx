import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, ListTodo } from 'lucide-react';
import { api } from '../api.js';
import { formatDate, formatRelative } from '../format.js';

function isToday(isoString) {
  return new Date(isoString).toDateString() === new Date().toDateString();
}

// The student's to-do list on the dashboard: missing work first, then what's due in the next days.
// The server decides what goes in each list (GET /api/upcoming).
export default function UpcomingList() {
  const [data, setData] = useState(null); // { days, missing, upcoming }
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/upcoming')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <ListTodo size={22} aria-hidden="true" />
          Upcoming tasks
        </h2>
        <Link to="/grades" className="small">See all</Link>
      </div>

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}

      {data && data.missing.length === 0 && data.upcoming.length === 0 && (
        <p className="muted">Nothing due in the next {data.days} days. 🎉</p>
      )}

      {data && (
        <ul className="task-list">
          {data.missing.map((a) => (
            <Task key={a.id} assignment={a} tag={<span className="tag tag-past">Missing</span>} />
          ))}
          {data.upcoming.map((a) => (
            <Task
              key={a.id}
              assignment={a}
              tag={
                isToday(a.due_at) ? (
                  <span className="tag tag-late">Due today</span>
                ) : (
                  <span className="tag">Due {formatRelative(a.due_at)}</span>
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Task({ assignment: a, tag }) {
  const due = new Date(a.due_at);
  return (
    <li>
      <Link to={`/assignments/${a.id}`} className="task" title={`Due ${formatDate(a.due_at)}`}>
        <span className="date-badge" aria-hidden="true">
          <span>{due.toLocaleDateString(undefined, { month: 'short' })}</span>
          <strong>{due.getDate()}</strong>
        </span>
        <span className="task-text">
          <span className="task-title">{a.title}</span>
          <span className="muted">{a.course_code}</span>
          {tag}
        </span>
        <ChevronRight size={18} className="task-arrow" aria-hidden="true" />
      </Link>
    </li>
  );
}
