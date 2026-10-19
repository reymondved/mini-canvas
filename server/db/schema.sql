-- Table definitions for Mini Canvas.
-- "IF NOT EXISTS" makes this safe to run more than once.

-- Every person who can log in. role decides what they can do.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 1, 2, 3... assigned by the database
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,                               -- no two users with the same email
  password_hash TEXT NOT NULL,                                      -- bcrypt hash, never the real password
  role          TEXT NOT NULL CHECK (role IN ('student', 'instructor')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login sessions (used by connect-pg-simple). Survives server restarts.
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR PRIMARY KEY, -- the random ID stored in the browser cookie
  sess   JSON NOT NULL,       -- what the server remembers, e.g. { "userId": 1 }
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
