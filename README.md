# Mini Canvas — HAU LMS Demo

> **Demo – not the official HAU system.**
> This is a private practice/portfolio project inspired by a school learning management system.
> It is not affiliated with or endorsed by Holy Angel University.

## Project rules

- The repository stays **private** and the app is **not deployed publicly**.
- Only **fake test accounts** are used. Never enter real student credentials.
- Passwords are always **hashed** with bcrypt, never stored in plain text.
- The app connects to the database as a **limited user** (`mini_canvas_app`), never as the `postgres` superuser.
- Uploaded files are limited to **5 MB** and **PDF, .docx, .txt, PNG, JPG, ZIP**. They're saved under random names in `server/uploads/` (ignored by Git) and can only be downloaded by the student who submitted them or the course's instructor.

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
- [x] **Phase 5** – Assignment submission, grading, and a grades page

## Folder structure

```
Mini Canvas/
├── README.md
├── .gitignore
├── server/              Express API
│   ├── .env.example     Template for secret settings (copy to .env)
│   ├── .env.test.example Template for test settings (copy to .env.test)
│   ├── vitest.config.js Test settings
│   ├── db/
│   │   ├── schema.sql   Table definitions
│   │   ├── demoData.js  The fake demo data + seedDemoData() (used by seed and tests)
│   │   └── seed.js      "npm run db:seed": resets the database to the demo data
│   ├── test/            Automated API tests (Vitest)
│   ├── uploads/         Submitted files (created automatically, ignored by Git)
│   └── src/
│       ├── app.js       Builds the Express app: sessions + routes
│       ├── index.js     Starts the app on PORT
│       ├── db.js        Shared connection to PostgreSQL
│       ├── access.js    The one rule for "may this user open this course?"
│       ├── uploads.js   File upload settings (size, types, random names)
│       ├── middleware/  Checks that run before routes (logged in, role)
│       └── routes/      API endpoints (auth, courses, assignments, submissions, grades)
└── client/              React app (the part you see in the browser)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/          Static files (logo)
    └── src/
        ├── main.jsx     App starting point
        ├── App.jsx      Routes: which URL shows which page
        ├── styles.css   Colors and layout
        ├── format.js    Shared helpers for dates, file sizes and statuses
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

   You can run `npm run db:seed` again any time. It **resets** courses, assignments, submissions and uploaded files to the demo data, so anything added since is removed.

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

## Automated tests

The server has API tests for every security rule: login, course access, uploads, grading and roles. They run against a **separate test database** (`mini_canvas_test`) and a separate uploads folder, so they never touch your demo data.

**First time only:**

1. Copy `server/.env.test.example` to `server/.env.test` and use the same app password as in `.env`.
2. As the `postgres` superuser, create the test database:

   ```sql
   CREATE DATABASE mini_canvas_test OWNER mini_canvas_app;
   ```

**Run the tests:**

```bash
cd server
npm test
```

Run them before every commit. If one fails, read its name: it tells you which rule broke.

## Demo accounts (fake)

| Role | Email | Password |
|---|---|---|
| Student | student@demo.test | Student123! |
| Instructor | instructor@demo.test | Instructor123! |
| Instructor | instructor2@demo.test | Instructor123! |

The demo student is enrolled in CS 101, WEB 201 and DB 210, but **not** MATH 120 (taught by instructor2). Use that to test that users can only open their own courses.

The seed also adds two example submissions from the demo student in CS 101: **Hello, World** (already graded, 9/10) and **Loops Practice** (waiting for a grade).

## Submission rules

- Students upload one file per assignment. They can replace it any time **until it's graded**; after that it's locked.
- Late submissions are allowed and marked **Late**.
- Instructors grade on each assignment's page: a whole-number score from 0 to the assignment's points, plus optional feedback. Grades can be updated.
- The Grades page totals only count graded assignments.

## API endpoints

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/auth/login` | Anyone | Checks email + password, starts a session |
| POST | `/api/auth/logout` | Anyone | Ends the session |
| GET | `/api/auth/me` | Logged in | Returns the logged-in user, or 401 |
| GET | `/api/courses` | Anyone | Public course catalog |
| GET | `/api/courses/mine` | Logged in | Student: enrolled courses. Instructor: courses they teach |
| GET | `/api/courses/:id` | Enrolled student or the course's instructor | Course with its assignments (404 otherwise) |
| GET | `/api/assignments/:id` | Enrolled student or the course's instructor | Assignment + my submission (student) or all submissions (instructor) |
| PUT | `/api/assignments/:id/submission` | Enrolled **student** | Upload or replace my file (form field `file`) |
| GET | `/api/submissions/:id/file` | That student or the course's instructor | Download the submitted file |
| PUT | `/api/submissions/:id/grade` | The course's **instructor** | Save `{ score, feedback }` |
| GET | `/api/grades` | **Student** | All my assignments and scores, by course |
