// Builds the Express app (middleware + routes) without starting it.
// index.js starts it on a port; the tests start it on a random free port.
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import assignmentRoutes from './routes/assignments.js';
import submissionRoutes from './routes/submissions.js';
import gradeRoutes from './routes/grades.js';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is missing. Copy server/.env.example to server/.env and fill it in.');
}

export const app = express();
const PgSessionStore = connectPgSimple(session);

// Read JSON request bodies, e.g. { "email": "...", "password": "..." }
app.use(express.json());

// Sessions: the server remembers who you are; the browser only holds a random ID in a cookie.
app.use(
  session({
    store: new PgSessionStore({ pool }), // save sessions in the "session" table, so restarts don't log you out
    secret: process.env.SESSION_SECRET, // signs the cookie so it can't be faked
    resave: false,                      // don't re-save sessions that didn't change
    saveUninitialized: false,           // don't create sessions for visitors who haven't logged in
    cookie: {
      httpOnly: true,             // JavaScript in the page can't read the cookie
      sameSite: 'lax',            // other websites can't send requests with your cookie
      secure: false,              // must be true on HTTPS; we only run on http://localhost
      maxAge: 1000 * 60 * 60 * 8, // log out automatically after 8 hours
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
