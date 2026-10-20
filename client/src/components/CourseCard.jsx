import { Link } from 'react-router-dom';
import { BookOpen, Code2, Database, Globe, Palette, Sigma } from 'lucide-react';

// Pick an icon from the course code: "CS 101" → code, "DB 210" → database, ...
const ICONS = { CS: Code2, WEB: Globe, DB: Database, MATH: Sigma, ART: Palette };

function courseIcon(code) {
  return ICONS[code.split(' ')[0].toUpperCase()] ?? BookOpen;
}

// One course card. index picks one of 4 color themes, so neighbouring cards look different.
// to: where the card links (leave it out for a card that isn't clickable).
// children: the bottom part (progress bar, counts...), different per page.
export default function CourseCard({ course, index, to, children }) {
  const Icon = courseIcon(course.code);
  const content = (
    <>
      <div className="course-card-top">
        <span className="icon-tile">
          <Icon size={24} aria-hidden="true" />
        </span>
      </div>
      <div className="course-card-body">
        <span className="course-code">{course.code}</span>
        <h3>{course.title}</h3>
        {children}
      </div>
    </>
  );

  const className = `card course-card theme-${index % 4}`;
  return to ? (
    <Link to={to} className={`${className} course-link`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
