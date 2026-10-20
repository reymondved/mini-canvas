const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']; // every other label, so it isn't crowded

// "2026-10-20" → a Date at local midnight (not UTC), so the weekday is right.
function parseDay(text) {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 0 = no submissions, 1, 2, 3+ = darker and darker.
function level(count) {
  return Math.min(count, 3);
}

// A GitHub-style grid: one column per week, one row per weekday (Mon at the top), one square per day.
// days: [{ date: "2026-10-20", count: 2 }, ...] oldest first, from the server.
export default function ActivityHeatmap({ days }) {
  // The first day might be a Thursday: add empty squares so every row stays one weekday.
  const firstWeekday = (parseDay(days[0].date).getDay() + 6) % 7; // Monday = 0
  const cells = [...Array(firstWeekday).fill(null), ...days];
  const weeks = Math.ceil(cells.length / 7);

  // A month label above the column that contains the 1st of that month.
  // The very first column always gets a label (its own month if no 1st falls in it).
  const monthLabels = Array.from({ length: weeks }, (_, week) => {
    const column = cells.slice(week * 7, week * 7 + 7).filter(Boolean);
    const first = column.find((c) => parseDay(c.date).getDate() === 1);
    const day = first ?? (week === 0 ? column[0] : undefined);
    return day ? parseDay(day.date).toLocaleDateString(undefined, { month: 'short' }) : '';
  });

  return (
    <div className="heatmap" role="img" aria-label={`Submissions per day over the last ${days.length} days`}>
      <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} aria-hidden="true">
        {monthLabels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="heatmap-body">
        <div className="heatmap-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        {/* grid-auto-flow: column fills each column top to bottom (Mon → Sun), then the next week */}
        <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
          {cells.map((cell, i) =>
            cell ? (
              <span
                key={cell.date}
                className={`heatmap-cell level-${level(cell.count)}`}
                title={`${parseDay(cell.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${cell.count} submission${cell.count === 1 ? '' : 's'}`}
              />
            ) : (
              <span key={`pad-${i}`} className="heatmap-cell empty" />
            )
          )}
        </div>
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        <span>None</span>
        {[0, 1, 2, 3].map((l) => (
          <span key={l} className={`heatmap-cell level-${l}`} />
        ))}
        <span>3+</span>
      </div>
    </div>
  );
}
