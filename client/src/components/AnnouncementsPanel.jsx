import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Megaphone, MessageSquare, Paperclip, Plus } from 'lucide-react';
import { api } from '../api.js';
import { formatDate, formatRelative } from '../format.js';
import AnnouncementForm from './AnnouncementForm.jsx';

// A card listing announcements, used on the dashboard, the course page and the admin page.
// Each one is a compact preview; clicking it opens the full announcement page
// (replies, mark as read/unread, edit/delete) at /announcements/:id.
//   loadUrl:    where to load them from
//   postUrl:    where to post new ones (leave out = this person can't post here)
//   limit:      show only the newest N (the dashboard shows 5)
//   showCourse: show which course each one is from (useful when mixing courses)
//   unreadOnly: hide announcements I've marked as read, with a "Show read" switch (the dashboard)
export default function AnnouncementsPanel({
  heading = 'Announcements',
  loadUrl,
  postUrl,
  limit,
  showCourse = false,
  unreadOnly = false,
}) {
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false); // is the "new announcement" form open?
  const [showRead, setShowRead] = useState(false);

  useEffect(() => {
    api(loadUrl)
      .then((body) => setAnnouncements(body.announcements))
      .catch((err) => setError(err.message));
  }, [loadUrl]);

  // Posting can include files, so it's sent as a FormData (a form with attachments).
  async function create({ title, body, files }) {
    const form = new FormData();
    form.append('title', title);
    form.append('body', body);
    files.forEach((file) => form.append('files', file));
    const result = await api(postUrl, { method: 'POST', form });
    setAnnouncements((list) => [result.announcement, ...list]);
    setWriting(false);
  }

  const unreadCount = announcements?.filter((a) => !a.is_read).length ?? 0;
  const readCount = (announcements?.length ?? 0) - unreadCount;
  const visible = announcements && (unreadOnly && !showRead ? announcements.filter((a) => !a.is_read) : announcements);
  const shown = visible && (limit ? visible.slice(0, limit) : visible);

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <Megaphone size={22} aria-hidden="true" />
          {heading}
          {unreadCount > 0 && <span className="tag tag-unread">{unreadCount} unread</span>}
        </h2>
        {postUrl && !writing && (
          <button type="button" className="btn btn-small" onClick={() => setWriting(true)}>
            <Plus size={16} aria-hidden="true" /> New announcement
          </button>
        )}
      </div>

      {writing && (
        <AnnouncementForm submitLabel="Post announcement" onSave={create} onCancel={() => setWriting(false)} />
      )}

      {error && <p className="alert-error" role="alert">{error}</p>}
      {!announcements && !error && <p className="muted">Loading…</p>}

      {shown && shown.length === 0 && (
        <p className="muted">
          {announcements.length > 0 ? 'You’re all caught up. 🎉' : 'No announcements yet.'}
        </p>
      )}

      {shown && shown.length > 0 && (
        <ul className="announcement-list">
          {shown.map((a) => (
            <li key={a.id}>
              <AnnouncementCard announcement={a} showCourse={showCourse} />
            </li>
          ))}
        </ul>
      )}

      {unreadOnly && readCount > 0 && (
        <button type="button" className="link-button" onClick={() => setShowRead((v) => !v)}>
          {showRead ? 'Hide read announcements' : `Show read (${readCount})`}
        </button>
      )}
    </section>
  );
}

// One compact, clickable preview. The whole box is a link to the full announcement.
function AnnouncementCard({ announcement: a, showCourse }) {
  return (
    <Link to={`/announcements/${a.id}`} className={a.is_read ? 'announcement-card' : 'announcement-card unread'}>
      <div className="announcement-card-text">
        <div className="announcement-head">
          {!a.is_read && <span className="unread-dot" aria-label="Unread" />}
          {showCourse && (
            <span className={a.course_id ? 'course-code' : 'tag tag-everyone'}>{a.course_code ?? 'Everyone'}</span>
          )}
          <h3>{a.title}</h3>
        </div>
        {/* Only the first 2 lines; the full text is on the announcement's page */}
        <p className="announcement-preview">{a.body}</p>
        <p className="announcement-meta">
          {a.author_name} · <span title={formatDate(a.created_at)}>{formatRelative(a.created_at)}</span>
          {a.files.length > 0 && (
            <span className="meta-count" title={`${a.files.length} attached file(s)`}>
              <Paperclip size={14} aria-hidden="true" /> {a.files.length}
            </span>
          )}
          {a.reply_count > 0 && (
            <span className="meta-count" title={`${a.reply_count} replies`}>
              <MessageSquare size={14} aria-hidden="true" /> {a.reply_count}
            </span>
          )}
        </p>
      </div>
      <ChevronRight size={20} className="task-arrow" aria-hidden="true" />
    </Link>
  );
}
