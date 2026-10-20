-- Migration 4: who has read which announcement, replies, and attached files.

-- Up Migration

-- "Read" is different for each person, so it gets its own table: one row = "this user read this announcement".
-- No row = unread. (Same idea as enrollments: a table that links two things.)
CREATE TABLE announcement_reads (
  user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  announcement_id INTEGER NOT NULL REFERENCES announcements (id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id) -- can't be "read" twice
);

-- Replies under a course announcement, shown oldest first. Visible to everyone in the course.
CREATE TABLE announcement_replies (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements (id) ON DELETE CASCADE,
  author_id       INTEGER NOT NULL REFERENCES users (id),
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcement_replies ON announcement_replies (announcement_id, created_at);

-- Files attached to an announcement (like submissions: the file is on disk, this row describes it).
CREATE TABLE announcement_files (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements (id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,        -- original name, only shown to people
  stored_name     TEXT NOT NULL UNIQUE, -- random name on disk
  file_type       TEXT NOT NULL,
  file_size       INTEGER NOT NULL
);

-- Down Migration
DROP TABLE announcement_files;
DROP TABLE announcement_replies;
DROP TABLE announcement_reads;
