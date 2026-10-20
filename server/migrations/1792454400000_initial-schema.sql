-- Migration 1: the tables from Phases 3–5.
-- "IF NOT EXISTS" lets this run on a database that already has these tables
-- (from before we used migrations): it then changes nothing, and is just recorded as done.

-- Up Migration

-- Every person who can log in. role decides what they can do.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 1, 2, 3... assigned by the database
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,                               -- no two users with the same email
  password_hash TEXT NOT NULL,                                      -- bcrypt hash, never the real password
  role          TEXT NOT NULL CHECK (role IN ('student', 'instructor')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A course is taught by one instructor.
-- REFERENCES makes a "foreign key": instructor_id must be the id of a real row in users.
CREATE TABLE IF NOT EXISTS courses (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,            -- e.g. "CS 101"
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  instructor_id INTEGER NOT NULL REFERENCES users (id)
);

-- Which student is in which course. One row = one student in one course.
CREATE TABLE IF NOT EXISTS enrollments (
  user_id   INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, course_id) -- the same student can't be enrolled twice
);

-- Assignments belong to a course. ON DELETE CASCADE: delete a course → its assignments go too.
CREATE TABLE IF NOT EXISTS assignments (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  due_at      TIMESTAMPTZ NOT NULL,
  points      INTEGER NOT NULL CHECK (points > 0)
);

-- A student's uploaded file for an assignment, plus the instructor's grade.
-- The file itself lives in server/uploads/; this row only describes it.
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments (id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,        -- original name, only shown to people (never used as a path)
  stored_name   TEXT NOT NULL UNIQUE, -- random name of the file on disk
  file_type     TEXT NOT NULL,        -- e.g. "application/pdf"
  file_size     INTEGER NOT NULL,     -- in bytes
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  score         INTEGER CHECK (score >= 0), -- empty (NULL) until graded
  feedback      TEXT,
  graded_at     TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)  -- one submission per student per assignment
);

-- Login sessions (used by connect-pg-simple). Survives server restarts.
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR PRIMARY KEY, -- the random ID stored in the browser cookie
  sess   JSON NOT NULL,       -- what the server remembers, e.g. { "userId": 1 }
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Down Migration
-- Undo = remove the tables, in reverse order (a table must go before the tables it points at).
-- WARNING: this deletes all the data in them.
DROP TABLE session;
DROP TABLE submissions;
DROP TABLE assignments;
DROP TABLE enrollments;
DROP TABLE courses;
DROP TABLE users;
