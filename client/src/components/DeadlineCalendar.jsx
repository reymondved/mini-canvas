import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// "2026-11-05" in LOCAL time, so a deadline at 23:59 in Manila lands on the right day.
function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// The days to show for one month: from the Monday on/before the 1st to the Sunday on/after the last day.
function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7)); // getDay(): Sunday = 0, so shift to Monday = 0
  const last = new Date(year, month + 1, 0);
  const end = new Date(year, month + 1, (7 - last.getDay()) % 7);
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

// A month calendar with a dot on every day that has a deadline.
// deadlines: [{ title, due_at }] — real assignment due dates from the server.
export default function DeadlineCalendar({ deadlines }) {
  const today = new Date();
  const [shown, setShown] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Group assignment titles by day, e.g. { "2026-11-5": ["Arrays Practice"] }
  const byDay = {};
  for (const d of deadlines) {
    const key = dayKey(new Date(d.due_at));
    (byDay[key] ??= []).push(d.title);
  }

  function move(step) {
    setShown(({ year, month }) => {
      const date = new Date(year, month + step, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  const monthName = new Date(shown.year, shown.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <CalendarDays size={22} aria-hidden="true" />
          Calendar
        </h2>
        <div className="calendar-nav">
          <button type="button" className="icon-button" onClick={() => move(-1)} aria-label="Previous month">
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="icon-button" onClick={() => move(1)} aria-label="Next month">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <p className="calendar-month" aria-live="polite">{monthName}</p>

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <span key={day} className="calendar-weekday">{day}</span>
        ))}
        {monthDays(shown.year, shown.month).map((date) => {
          const key = dayKey(date);
          const titles = byDay[key];
          const classes = ['calendar-day'];
          if (date.getMonth() !== shown.month) classes.push('other-month');
          if (key === dayKey(today)) classes.push('today');
          if (titles) classes.push('has-deadline');
          return (
            <span key={key} className={classes.join(' ')} title={titles ? `Due: ${titles.join(', ')}` : undefined}>
              {date.getDate()}
              {titles && <span className="visually-hidden">, due: {titles.join(', ')}</span>}
            </span>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><span className="legend-dot" />Deadlines</span>
        <span><span className="legend-dot today" />Today</span>
      </div>
    </section>
  );
}
