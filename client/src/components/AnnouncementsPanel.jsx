import { useEffect, useState } from 'react';
import { Check, Mail, Megaphone, MessageSquare, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import { formatDate, formatFileSize, formatRelative } from '../format.js';
import AnnouncementForm from './AnnouncementForm.jsx';
import ReplyThread from './ReplyThread.jsx';

// A card listing announcements, used on the dashboard, the course page and the admin page.
//   loadUrl:    where to load them from
//   postUrl:    where to post new ones (leave out = this person can't post here)
//   limit:      show only the newest N (the dashboard shows 5)
//   showCourse: show which course each one is from (useful when mixing courses)
//   unreadOnly: hide announcements I've marked as read, with a "Show read" switch (the dashboard)
// Edit and Delete only appear on your OWN posts; the server checks that again anyway.
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

  // Replace one announcement in the list (after editing, marking read, a new reply...).
  function replace(updated) {
    setAnnouncements((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }

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

  async function remove(announcement) {
    if (!window.confirm(`Delete "${announcement.title}"? Its replies and files are deleted too.`)) return;
    try {
      await api(`/api/announcements/${announcement.id}`, { method: 'DELETE' });
      setAnnouncements((list) => list.filter((a) => a.id !== announcement.id));
    } catch (err) {
      setError(err.message);
    }
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
            <AnnouncementItem key={a.id} announcement={a} showCourse={showCourse} onChange={replace} onDelete={remove} />
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

// One announcement: text, files, read/unread, replies, and (for the author) edit/delete.
function AnnouncementItem({ announcement: a, showCourse, onChange, onDelete }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [error, setError] = useState('');

  async function save(values) {
    const body = await api(`/api/announcements/${a.id}`, {
      method: 'PUT',
      json: { title: values.title, body: values.body },
    });
    onChange(body.announcement);
    setEditing(false);
  }

  // PUT = mark as read, DELETE = mark as unread (only for me).
  async function toggleRead() {
    setError('');
    try {
      await api(`/api/announcements/${a.id}/read`, { method: a.is_read ? 'DELETE' : 'PUT' });
      onChange({ ...a, is_read: !a.is_read });
    } catch (err) {
      setError(err.message);
    }
  }

  if (editing) {
    return (
      <li className="announcement">
        <AnnouncementForm initial={a} submitLabel="Save changes" onSave={save} onCancel={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className={a.is_read ? 'announcement' : 'announcement unread'}>
      <div className="announcement-head">
        {!a.is_read && <span className="unread-dot" aria-label="Unread" />}
        {showCourse && (
          <span className={a.course_id ? 'course-code' : 'tag tag-everyone'}>{a.course_code ?? 'Everyone'}</span>
        )}
        <h3>{a.title}</h3>
      </div>

      {/* Plain text: React shows "<script>" as characters, it never runs it */}
      <p className="announcement-body">{a.body}</p>

      {a.files.length > 0 && (
        <ul className="attachment-list">
          {a.files.map((f) => (
            <li key={f.id}>
              <Paperclip size={16} aria-hidden="true" />
              <a href={`/api/announcements/files/${f.id}`}>{f.file_name}</a>
              <span className="muted small">({formatFileSize(f.file_size)})</span>
            </li>
          ))}
        </ul>
      )}

      <p className="announcement-meta">
        {a.author_name} · <span title={formatDate(a.created_at)}>{formatRelative(a.created_at)}</span>
        {a.edited_at && <span className="tag tag-soon">Edited {formatDate(a.edited_at)}</span>}
      </p>

      <div className="announcement-actions">
        <button type="button" className="btn btn-small" onClick={toggleRead}>
          {a.is_read ? (
            <><Mail size={14} aria-hidden="true" /> Mark as unread</>
          ) : (
            <><Check size={14} aria-hidden="true" /> Mark as read</>
          )}
        </button>
        {/* Site-wide announcements take no replies */}
        {a.course_id !== null && (
          <button
            type="button"
            className="btn btn-small"
            aria-expanded={repliesOpen}
            onClick={() => setRepliesOpen((open) => !open)}
          >
            <MessageSquare size={14} aria-hidden="true" />
            {a.reply_count > 0 ? `Replies (${a.reply_count})` : 'Reply'}
          </button>
        )}
        {a.author_id === user.id && (
          <>
            <button type="button" className="btn btn-small" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden="true" /> Edit
            </button>
            <button type="button" className="btn btn-small" onClick={() => onDelete(a)}>
              <Trash2 size={14} aria-hidden="true" /> Delete
            </button>
          </>
        )}
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}

      {repliesOpen && (
        <ReplyThread announcementId={a.id} onCountChange={(count) => onChange({ ...a, reply_count: count })} />
      )}
    </li>
  );
}
