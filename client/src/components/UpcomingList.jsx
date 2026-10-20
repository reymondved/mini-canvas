import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatRelative } from '../format.js';

// The student's to-do list on the dashboard: missing work first, then what's due soon.
// The server decides what goes in each list (GET /api/upcoming).
export default function UpcomingList() {
  const [data, setData] = useState(null); // { days, missing, upcoming }
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/upcoming')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="alert-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading your to-do list…</p>;

  return (
    <section className="upcoming" aria-label="To do">
      {data.missing.length > 0 && (
        <div className="card upcoming-group upcoming-missing">
          <h2>Missing ({data.missing.length})</h2>
          <ul>
            {data.missing.map((a) => (
              <UpcomingItem key={a.id} assignment={a} label="was due" />
            ))}
          </ul>
        </div>
      )}

      <div className="card upcoming-group">
        <h2>Coming up</h2>
        {data.upcoming.length === 0 ? (
          <p className="muted">Nothing due in the next {data.days} days. 🎉</p>
        ) : (
          <ul>
            {data.upcoming.map((a) => (
              <UpcomingItem key={a.id} assignment={a} label="due" />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function UpcomingItem({ assignment: a, label }) {
  return (
    <li>
      <Link to={`/assignments/${a.id}`}>{a.title}</Link>
      <span className="course-code">{a.course_code}</span>
      {/* title= shows the exact date when you hover over "in 2 days" */}
      <span className="muted small" title={formatDate(a.due_at)}>
        {label} {formatRelative(a.due_at)}
      </span>
    </li>
  );
}
