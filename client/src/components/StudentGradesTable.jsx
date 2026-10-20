import { Link } from 'react-router';
import { formatDate, submissionStatus } from '../format.js';

// Total = points earned on GRADED assignments / points possible on those assignments.
export function courseTotal(assignments) {
  const graded = assignments.filter((a) => a.score !== null);
  const earned = graded.reduce((sum, a) => sum + a.score, 0);
  const possible = graded.reduce((sum, a) => sum + a.points, 0);
  return { earned, possible, percent: possible > 0 ? Math.round((earned / possible) * 100) : null };
}

export function TotalText({ assignments }) {
  const total = courseTotal(assignments);
  return total.percent === null ? 'No grades yet' : `${total.earned} / ${total.possible} (${total.percent}%)`;
}

// One student's grades in one course. Used on the Grades page and on a course's Grades tab.
export default function StudentGradesTable({ assignments }) {
  if (assignments.length === 0) return <p className="muted">No assignments yet.</p>;
  return (
    // A table, because this really is rows and columns of data
    <div className="table-wrap">
      <table className="grades-table">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Due</th>
            <th>Status</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => {
            const status = submissionStatus(a);
            return (
              <tr key={a.id}>
                <td>
                  <Link to={`/assignments/${a.id}`}>{a.title}</Link>
                  {a.feedback && <p className="muted small">{a.feedback}</p>}
                </td>
                <td>{formatDate(a.due_at)}</td>
                <td><span className={status.className}>{status.label}</span></td>
                <td>{a.score !== null ? `${a.score} / ${a.points}` : `– / ${a.points}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
