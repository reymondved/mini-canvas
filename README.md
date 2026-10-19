# Mini Canvas — HAU LMS Demo

> **Demo – not the official HAU system.**
> This is a private practice/portfolio project inspired by a school learning management system.
> It is not affiliated with or endorsed by Holy Angel University.

## Project rules

- The repository stays **private** and the app is **not deployed publicly**.
- Only **fake test accounts** are used. Never enter real student credentials.
- Passwords are always **hashed** with bcrypt, never stored in plain text.
- The app connects to the database as a **limited user** (`mini_canvas_app`), never as the `postgres` superuser.

## Stack

| Part | Technology |
|---|---|
| Frontend | React + Vite (JavaScript, plain CSS) |
| Backend | Node.js + Express |
| Database | PostgreSQL 18 (plain SQL with the `pg` package) |
| Login persistence | Sessions with cookies, stored in PostgreSQL |

## Roadmap

- [x] **Phase 1** – Login page with validation, Forgot Password and Browse Courses pages
- [x] **Phase 2** – Express backend with login and logout endpoints
- [x] **Phase 3** – PostgreSQL database, real authentication, student and instructor roles
- [x] **Phase 4** – Student dashboard and course pages with assignments
- [ ] **Phase 5** – Assignment submission, grading, and a grades page

## Folder structure

```
Mini Canvas/
├── README.md
├── .gitignore
├── server/              Express API
│   ├── .env.example     Template for secret settings (copy to .env)
│   ├── db/
│   │   ├── schema.sql   Table definitions
│   │   └── seed.js      Creates tables and fake demo data
│   └── src/
│       ├── index.js     Starts the server, sets up sessions
│       ├── db.js        Shared connection to PostgreSQL
│       ├── middleware/  Checks that run before routes (e.g. "must be logged in")
│       └── routes/      API endpoints (auth, courses)
└── client/              React app (the part you see in the browser)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/          Static files (logo)
    └── src/
        ├── main.jsx     App starting point
        ├── App.jsx      Routes: which URL shows which page
        ├── styles.css   Colors and layout
        ├── auth/        Shared "who is logged in" state (React Context)
        ├── components/  Reusable pieces (demo banner, header, RequireAuth)
        └── pages/       One file per screen
```

## Running the app

Requires [Node.js](https://nodejs.org) (LTS) and [PostgreSQL](https://www.postgresql.org/download/) 18. You need **two terminals**: one for the server, one for the client.

**0. Database (first time only)**

1. Copy `server/.env.example` to `server/.env`. Set a long random `SESSION_SECRET` and choose a password for the app user in `DATABASE_URL`.
2. As the `postgres` superuser, create the app user and database (use the same password as in `DATABASE_URL`):

   ```sql
   CREATE ROLE mini_canvas_app LOGIN PASSWORD 'your-app-password';
   CREATE DATABASE mini_canvas OWNER mini_canvas_app;
   ```

3. Create the tables and demo data:

   ```bash
   cd server
   npm install
   npm run db:seed
   ```

   You can run `npm run db:seed` again any time. It **resets** courses and assignments to the demo data, so anything added by hand is removed.

**1. Server**

```bash
cd server
npm run dev
```

The server runs on http://localhost:3001 and restarts automatically when you change a file.

**2. Client**

```bash
cd client
npm install
npm run dev
```

Then open http://localhost:5173 in your browser. Requests to `/api/...` are forwarded to the server by Vite's proxy.

## Demo accounts (fake)

| Role | Email | Password |
|---|---|---|
| Student | student@demo.test | Student123! |
| Instructor | instructor@demo.test | Instructor123! |
| Instructor | instructor2@demo.test | Instructor123! |

The demo student is enrolled in CS 101, WEB 201 and DB 210, but **not** MATH 120 (taught by instructor2). Use that to test that users can only open their own courses.

## API endpoints

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/auth/login` | Anyone | Checks email + password, starts a session |
| POST | `/api/auth/logout` | Anyone | Ends the session |
| GET | `/api/auth/me` | Logged in | Returns the logged-in user, or 401 |
| GET | `/api/courses` | Anyone | Public course catalog |
| GET | `/api/courses/mine` | Logged in | Student: enrolled courses. Instructor: courses they teach |
| GET | `/api/courses/:id` | Enrolled student or the course's instructor | Course with its assignments (404 otherwise) |
