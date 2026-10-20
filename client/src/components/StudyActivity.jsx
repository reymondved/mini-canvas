import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api.js';
import ActivityHeatmap from './ActivityHeatmap.jsx';

// The browser's time zone, e.g. "Asia/Manila", so the server groups submissions by YOUR days.
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Study activity card: a heatmap of submission days (last 12 weeks) + where requirements stand.
//   url:   /api/activity (my own) or /api/courses/:id/students/:userId/activity (instructor view)
//   title: the card's heading
//   note:  a line under the heading (students are told who else can see this)
export default function StudyActivity({ url, title = 'Study activity', note }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`${url}?tz=${encodeURIComponent(TIME_ZONE)}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [url]);

  const total = data?.days.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <Activity size={22} aria-hidden="true" />
          {title}
        </h2>
        {data && <span className="muted small">{total} submissions · last 12 weeks</span>}
      </div>
      {note && <p className="muted small activity-note">{note}</p>}

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!data && !error && <p className="muted">Loading…</p>}

      {data && (
        <div className="activity-layout">
          <ActivityHeatmap days={data.days} />
          <div className="requirements">
            <h3>Requirements</h3>
            <p className="requirement">
              <CheckCircle2 size={20} className="ok" aria-hidden="true" />
              <span>Submitted on time</span>
              <strong>{data.requirements.on_time}</strong>
            </p>
            <p className="requirement">
              <Clock size={20} className="late" aria-hidden="true" />
              <span>Submitted late</span>
              <strong>{data.requirements.late}</strong>
            </p>
            <p className="requirement">
              <AlertCircle size={20} className="missing" aria-hidden="true" />
              <span>Missing</span>
              <strong>{data.requirements.missing}</strong>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
