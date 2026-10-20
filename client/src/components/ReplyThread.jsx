import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { formatDate, formatRelative } from '../format.js';

const MAX_REPLY_LENGTH = 2000; // must match the server

// The replies under one course announcement, plus a box to write one.
// onCountChange tells the announcement how many replies there are now (for "Replies (3)").
export default function ReplyThread({ announcementId, onCountChange }) {
  const [replies, setReplies] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api(`/api/announcements/${announcementId}/replies`)
      .then((body) => setReplies(body.replies))
      .catch((err) => setError(err.message));
  }, [announcementId]);

  function update(list) {
    setReplies(list);
    onCountChange(list.length);
  }

  async function send(event) {
    event.preventDefault();
    setError('');
    if (!text.trim()) return setError('Please write a reply.');
    setSending(true);
    try {
      const body = await api(`/api/announcements/${announcementId}/replies`, { method: 'POST', json: { body: text } });
      update([...replies, body.reply]);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function remove(reply) {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await api(`/api/announcements/replies/${reply.id}`, { method: 'DELETE' });
      update(replies.filter((r) => r.id !== reply.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const textId = `reply-${announcementId}`;
  return (
    <div className="reply-thread">
      {!replies && !error && <p className="muted small">Loading replies…</p>}
      {replies && replies.length > 0 && (
        <ul className="reply-list">
          {replies.map((r) => (
            <li key={r.id} className="reply">
              <p className="reply-meta">
                <strong>{r.author_name}</strong>
                {r.author_role === 'instructor' && <span className="tag">Instructor</span>}
                <span title={formatDate(r.created_at)}>{formatRelative(r.created_at)}</span>
                {r.can_delete && (
                  <button type="button" className="icon-button reply-delete" onClick={() => remove(r)} aria-label="Delete reply">
                    <Trash2 size={16} />
                  </button>
                )}
              </p>
              {/* Plain text, like announcements: never turned into HTML */}
              <p className="reply-body">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="reply-form" onSubmit={send} noValidate>
        <label htmlFor={textId} className="visually-hidden">Write a reply</label>
        <textarea
          id={textId}
          rows="2"
          maxLength={MAX_REPLY_LENGTH}
          placeholder="Write a reply…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-compact" disabled={sending}>
            {sending ? 'Sending…' : 'Reply'}
          </button>
          <span className="muted small">Everyone in this course can see replies.</span>
        </div>
      </form>
      {error && <p className="alert-error" role="alert">{error}</p>}
    </div>
  );
}
