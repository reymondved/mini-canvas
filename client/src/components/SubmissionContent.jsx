import { formatFileSize } from '../format.js';

// The kinds of submission (must match the server's SUBMISSION_TYPES).
export const SUBMISSION_TYPE_LABELS = { file: 'File upload', text: 'Text entry', url: 'Website link' };

// "File upload · Text entry"
export function describeTypes(types) {
  return types.map((t) => SUBMISSION_TYPE_LABELS[t]).join(' · ');
}

// Only real web links become clickable. The server already refuses anything else,
// but a "javascript:" link would run code when clicked, so we check again here.
function isWebLink(url) {
  return /^https?:\/\//i.test(url);
}

// What a student handed in: any of a file, a text entry and a link. Used by students and instructors.
export default function SubmissionContent({ submission }) {
  return (
    <>
      {submission.file_name && (
        <p>
          <a href={`/api/submissions/${submission.id}/file`}>{submission.file_name}</a>{' '}
          <span className="muted">({formatFileSize(submission.file_size)})</span>
        </p>
      )}
      {submission.url && (
        <p className="submission-link">
          Link:{' '}
          {isWebLink(submission.url) ? (
            // noopener noreferrer: the other site can't control or see our page.
            <a href={submission.url} target="_blank" rel="noopener noreferrer">{submission.url}</a>
          ) : (
            submission.url
          )}
        </p>
      )}
      {/* Plain text in {}: React shows "<script>" as letters, it never runs it. */}
      {submission.text_body && <div className="submission-text">{submission.text_body}</div>}
    </>
  );
}
