// The bottom of a course card, used on the dashboard and the Courses page.

// Students: "2 / 3 submitted" + a progress bar. Real numbers from the server.
export function StudentProgress({ course }) {
  const { assignment_count: total, submitted_count: done } = course;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <>
      <div className="course-card-stats">
        <span>
          {done} / {total} submitted
        </span>
        <span>{percent}%</span>
      </div>
      {/* role="progressbar" tells screen readers what this bar means */}
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${course.code} progress`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </>
  );
}

// Instructors: how many assignments, and how many submissions still need a grade.
export function TeachingSummary({ course }) {
  return (
    <div className="course-card-stats">
      <span>{course.assignment_count} assignments</span>
      {course.to_grade_count > 0 ? (
        <span className="tag tag-late">{course.to_grade_count} to grade</span>
      ) : (
        <span className="tag tag-done">All graded</span>
      )}
    </div>
  );
}
