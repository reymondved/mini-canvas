import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Check, Mail, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import { formatDate, formatFileSize, formatRelative } from '../format.js';
import AnnouncementForm from '../components/AnnouncementForm.jsx';
import ReplyThread from '../components/ReplyThread.jsx';

// The full announcement: text, attachments, mark as read/unread, all replies,
// and (for the author) edit and delete. Opened by clicking a card in any announcement list.
export default function AnnouncementPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setAnnouncement(null);
    setError('');
    api(`/api/announcements/${id}`)
      .then((body) => setAnnouncement(body.announcement))
      .catch((err) => setError(err.message));
  }, [id]);

  // Where "Back" goes: the course page for course announcements, otherwise your home page.
  const home = user.role === 'admin' ? '/admin/users' : '/dashboard';
  const backTo = announcement?.course_id ? `/courses/${announcement.course_id}` : home;
  const backLabel = announcement?.course_id ? `Back to ${announcement.course_code}` : 'Back';

  if (error) {
    return (
      <main className="page">
        <p className="alert-error" role="alert">{error}</p>
        <Link to={home}>← Back</Link>
      </main>
    );
  }
  if (!announcement) {
    return <main className="page"><p className="muted">Loading…</p></main>;
  }

  const a = announcement;
  const isAuthor = a.author_id === user.id;

  // PUT = mark as read, DELETE = mark as unread (only for me).
  async function toggleRead() {
    setError('');
    try {
      await api(`/api/announcements/${a.id}/read`, { method: a.is_read ? 'DELETE' : 'PUT' });
      setAnnouncement({ ...a, is_read: !a.is_read });
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(values) {
    const body = await api(`/api/announcements/${a.id}`, {
      method: 'PUT',
      json: { title: values.title, body: values.body },
    });
    setAnnouncement(body.announcement);
    setEditing(false);
  }

  async function remove() {
    if (!window.confirm(`Delete "${a.title}"? Its replies and files are deleted too.`)) return;
    try {
      await api(`/api/announcements/${a.id}`, { method: 'DELETE' });
      navigate(backTo, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page narrow-wide">
      <Link to={backTo}>← {backLabel}</Link>

      <article className="card announcement-full">
        {editing ? (
          <>
            <h1>Edit announcement</h1>
            <AnnouncementForm initial={a} submitLabel="Save changes" onSave={save} onCancel={() => setEditing(false)} />
          </>
        ) : (
          <>
            <div className="announcement-head">
              <span className={a.course_id ? 'course-code' : 'tag tag-everyone'}>{a.course_code ?? 'Everyone'}</span>
              {!a.is_read && <span className="tag tag-unread">Unread</span>}
            </div>
            <h1>{a.title}</h1>
            <p className="announcement-meta">
              {a.author_name} · <span title={formatDate(a.created_at)}>Posted {formatDate(a.created_at)}</span>
              {a.edited_at && <span className="tag tag-soon">Edited {formatDate(a.edited_at)}</span>}
            </p>

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

            <div className="announcement-actions">
              <button type="button" className={a.is_read ? 'btn btn-small' : 'btn btn-primary btn-compact'} onClick={toggleRead}>
                {a.is_read ? (
                  <><Mail size={14} aria-hidden="true" /> Mark as unread</>
                ) : (
                  <><Check size={14} aria-hidden="true" /> Mark as read</>
                )}
              </button>
              {isAuthor && (
                <>
                  <button type="button" className="btn btn-small" onClick={() => setEditing(true)}>
                    <Pencil size={14} aria-hidden="true" /> Edit
                  </button>
                  <button type="button" className="btn btn-small" onClick={remove}>
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </article>

      {/* Site-wide announcements take no replies */}
      {a.course_id !== null && (
        <section className="card">
          <h2>Replies{a.reply_count > 0 ? ` (${a.reply_count})` : ''}</h2>
          {a.reply_count === 0 && <p className="muted">No replies yet. Ask a question or say thanks.</p>}
          <ReplyThread
            announcementId={a.id}
            onCountChange={(count) => setAnnouncement((current) => ({ ...current, reply_count: count }))}
          />
        </section>
      )}
    </main>
  );
}
