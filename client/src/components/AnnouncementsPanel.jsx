import { useEffect, useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';
import { formatDate, formatRelative } from '../format.js';
import AnnouncementForm from './AnnouncementForm.jsx';

// A card listing announcements, used on the dashboard, the course page and the admin page.
//   loadUrl:  where to load them from
//   postUrl:  where to post new ones (leave out = this person can't post here)
//   limit:    show only the newest N (the dashboard shows 5)
//   showCourse: show which course each one is from (useful when mixing courses)
// Edit and Delete only appear on your OWN posts; the server checks that again anyway.
export default function AnnouncementsPanel({ heading = 'Announcements', loadUrl, postUrl, limit, showCourse = false }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false); // is the "new announcement" form open?
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    api(loadUrl)
      .then((body) => setAnnouncements(body.announcements))
      .catch((err) => setError(err.message));
  }, [loadUrl]);

  async function create(values) {
    const body = await api(postUrl, { method: 'POST', json: values });
    setAnnouncements((list) => [body.announcement, ...list]);
    setWriting(false);
  }

  async function save(id, values) {
    const body = await api(`/api/announcements/${id}`, { method: 'PUT', json: values });
    setAnnouncements((list) => list.map((a) => (a.id === id ? body.announcement : a)));
    setEditingId(null);
  }

  async function remove(announcement) {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    try {
      await api(`/api/announcements/${announcement.id}`, { method: 'DELETE' });
      setAnnouncements((list) => list.filter((a) => a.id !== announcement.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const shown = announcements && (limit ? announcements.slice(0, limit) : announcements);

  return (
    <section className="card">
      <div className="card-header">
        <h2>
          <Megaphone size={22} aria-hidden="true" />
          {heading}
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
      {shown && shown.length === 0 && <p className="muted">No announcements yet.</p>}

      {shown && shown.length > 0 && (
        <ul className="announcement-list">
          {shown.map((a) => (
            <li key={a.id} className="announcement">
              {editingId === a.id ? (
                <AnnouncementForm
                  initial={a}
                  submitLabel="Save changes"
                  onSave={(values) => save(a.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="announcement-head">
                    {showCourse && (
                      <span className={a.course_id ? 'course-code' : 'tag tag-everyone'}>
                        {a.course_code ?? 'Everyone'}
                      </span>
                    )}
                    <h3>{a.title}</h3>
                  </div>
                  {/* Plain text: React shows "<script>" as characters, it never runs it */}
                  <p className="announcement-body">{a.body}</p>
                  <p className="announcement-meta">
                    {a.author_name} · <span title={formatDate(a.created_at)}>{formatRelative(a.created_at)}</span>
                    {a.edited_at && <span className="tag tag-soon">Edited {formatDate(a.edited_at)}</span>}
                  </p>
                  {a.author_id === user.id && (
                    <div className="announcement-actions">
                      <button type="button" className="btn btn-small" onClick={() => setEditingId(a.id)}>
                        <Pencil size={14} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" className="btn btn-small" onClick={() => remove(a)}>
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
