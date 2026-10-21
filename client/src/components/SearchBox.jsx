import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, ClipboardList, Megaphone, Search, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api.js';

const MIN_LENGTH = 2; // must match the server
const WAIT_MS = 300; // pause after typing before we search ("debounce")

// Shows the matching part of a text in bold: "Ohm's Law" + "ohm" → <mark>Ohm</mark>'s Law
function Highlight({ text, query }) {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

// Turns the server's answer into one flat list of clickable results, grouped by type.
function toItems(results, isAdmin) {
  return [
    ...results.courses.map((c) => ({
      group: 'Courses',
      icon: BookOpen,
      key: `c${c.id}`,
      label: `${c.code} ${c.title}`,
      to: isAdmin ? `/admin/courses/${c.id}` : `/courses/${c.id}`,
    })),
    ...results.assignments.map((a) => ({
      group: 'Assignments',
      icon: ClipboardList,
      key: `a${a.id}`,
      label: a.title,
      detail: a.course_code,
      to: `/assignments/${a.id}`,
    })),
    ...results.announcements.map((a) => ({
      group: 'Announcements',
      icon: Megaphone,
      key: `n${a.id}`,
      label: a.title,
      detail: a.course_code ?? 'Everyone',
      to: `/announcements/${a.id}`,
    })),
    ...results.users.map((u) => ({
      group: 'Users',
      icon: User,
      key: `u${u.id}`,
      label: u.name,
      detail: u.email,
      to: '/admin/users',
    })),
  ];
}

// The search box in the top bar, with results in a dropdown as you type.
export default function SearchBox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = nothing searched yet
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // which result the arrow keys are on
  const [error, setError] = useState('');
  const boxRef = useRef(null);

  // Search when typing PAUSES. If you keep typing, the timer restarts and any request that's
  // already on its way is cancelled (AbortController), so an old, slow answer can't show up last.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_LENGTH) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((body) => {
          setResults(body);
          setActive(0);
          setError('');
        })
        .catch((err) => {
          if (err.name !== 'AbortError') setError(err.message);
        });
    }, WAIT_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the dropdown when you click anywhere outside it.
  useEffect(() => {
    function onMouseDown(event) {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const items = results ? toItems(results, user.role === 'admin') : [];

  function go(item) {
    navigate(item.to);
    setQuery('');
    setResults(null);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && items[active]) {
      event.preventDefault();
      go(items[active]);
    }
  }

  const showDropdown = open && query.trim().length >= MIN_LENGTH && (results || error);
  const q = query.trim();

  return (
    <div className="search-box" ref={boxRef}>
      <label className="search">
        <Search size={18} aria-hidden="true" />
        <span className="visually-hidden">Search</span>
        <input
          type="search"
          placeholder={user.role === 'admin' ? 'Search users and courses…' : 'Search courses, assignments, announcements…'}
          value={query}
          maxLength={100}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={Boolean(showDropdown)}
          aria-controls="search-results"
          aria-activedescendant={showDropdown && items[active] ? `search-${items[active].key}` : undefined}
          aria-autocomplete="list"
        />
      </label>

      {showDropdown && (
        <div className="search-dropdown" id="search-results" role="listbox" aria-label="Search results">
          {error && <p className="alert-error">{error}</p>}
          {results && items.length === 0 && <p className="muted search-empty">No results for “{q}”.</p>}
          {items.map((item, i) => (
            <div key={item.key}>
              {(i === 0 || items[i - 1].group !== item.group) && <p className="search-group">{item.group}</p>}
              <button
                type="button"
                id={`search-${item.key}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'search-result active' : 'search-result'}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
              >
                <item.icon size={16} aria-hidden="true" />
                <span className="search-result-label">
                  <Highlight text={item.label} query={q} />
                </span>
                {item.detail && <span className="muted small">{item.detail}</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
