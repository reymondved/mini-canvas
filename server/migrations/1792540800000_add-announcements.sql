-- Migration 3: announcements from instructors (one course) and admins (everyone).

-- Up Migration

CREATE TABLE announcements (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- NULL = a site-wide announcement for everyone (posted by an admin).
  -- ON DELETE CASCADE: if a course is ever deleted, its announcements go with it.
  course_id  INTEGER REFERENCES courses (id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES users (id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,  -- plain text only; React shows it as text, never as HTML
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at  TIMESTAMPTZ     -- empty until someone edits it, then shown as "Edited ..."
);

-- An index makes "newest announcements for these courses" fast, even with thousands of rows.
CREATE INDEX idx_announcements_course ON announcements (course_id, created_at DESC);

-- Down Migration
DROP TABLE announcements;
