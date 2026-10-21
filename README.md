# Eng Academy: a learning platform demo

> **Demo project.** A private practice/portfolio project: a small learning management system
> for courses, assignments, submissions and grades. It uses fake data only and is not an official school system.

## Project rules

- The repository stays **private** and the app is **not deployed publicly**.
- Only **fake test accounts** are used. Never enter real student credentials.
- Passwords are always **hashed** with bcrypt, never stored in plain text.
- The app connects to the database as a **limited user** (`mini_canvas_app`), never as the `postgres` superuser.
- Uploaded files are limited to **5 MB** and **PDF, .docx, .txt, PNG, JPG, ZIP**. They're saved under random names in `server/uploads/` (ignored by Git) and can only be downloaded by the student who submitted them or the course's instructor.

## Stack

| Part | Technology |
|---|---|
| Frontend | React 18 + Vite 8 (JavaScript, plain CSS), React Router 7, lucide-react icons, Inter font |
| Backend | Node.js + Express |
| Database | PostgreSQL 18 (plain SQL with the `pg` package) |
| Login persistence | Sessions with cookies, stored in PostgreSQL |

## Roadmap

- [x] **Phase 1** – Login page with validation, Forgot Password and Browse Courses pages
- [x] **Phase 2** – Express backend with login and logout endpoints
- [x] **Phase 3** – PostgreSQL database, real authentication, student and instructor roles
- [x] **Phase 4** – Student dashboard and course pages with assignments
- [x] **Phase 5** – Assignment submission, grading, and a grades page
- [x] **Extra** – Automated API tests (Vitest)
- [x] **Extra** – Admin role: manage users and courses, temporary passwords, database migrations
- [x] **Extra** – Instructors create and edit assignments
- [x] **Extra** – "Missing" and "Coming up" lists on the student dashboard
- [x] **Extra** – Redesign as **Eng Academy**: sidebar layout, new dashboard, blue design system
- [x] **Extra** – Announcements: instructors post to their courses, admins post site-wide
- [x] **Extra** – Announcement replies, read/unread per person, and file attachments
- [x] **Extra** – Courses page and course home tabs: About (with syllabus), Announcements, Assignments, Modules, Grades (with an instructor gradebook), People
- [x] **Extra** – Study activity: a 12-week submissions heatmap and a Requirements summary (on time / late / missing)
- [x] **Extra** – Search in the top bar
- [ ] **Later** – Modules, class schedule, resources, notifications, messages (shown as "Coming soon" for now)

## Search

- The top bar's search box shows results **while you type** (after a 0.3 s pause, so typing doesn't send a request per key), grouped by type, with the match in bold. ↑ ↓ move, **Enter** opens, **Esc** closes.
- **Students and instructors** find their own courses, those courses' assignments, and the announcements they can see (titles **and** text). **Admins** find users and courses.
- Search uses the **same access rules** as the rest of the app, so it never shows anything you couldn't open.
- `%` and `_` (wildcards in SQL `LIKE`) are escaped, so they're searched as plain characters.

## Study activity

- A **heatmap of the last 12 weeks**: one square per day, darker = more submissions that day (assignments and quizzes). Only real **submissions** count; nothing like page views or time spent is tracked.
- A **Requirements** box: assignments **submitted on time**, **submitted late**, and **missing** (past due, nothing submitted).
- Days follow **your time zone** (the browser sends it, e.g. `Asia/Manila`), so a late-night submission counts for the right day.
- **Who can see it:** the student (their whole activity, on the dashboard) and **each instructor, only for their own course** (People tab → Activity). Admins can't. Students see a note saying their instructors can see it.
- `npm run db:seed` adds a finished past course (**ENGR 100 Engineering Drawing, last term**) with weekly submissions so the heatmap isn't empty. The tests seed without it.

## Course home

**Courses** in the sidebar lists only the courses you have access to (enrolled or teaching). Opening one shows tabs, each with its own address (for example `/courses/1/people`):

| Tab | Students | The course's instructor |
|---|---|---|
| **About** | Description, instructor, course code, number of students, syllabus | Same, plus **edit the syllabus** text and attach/replace/remove one syllabus file |
| **Announcements** | This course's announcements | Same, plus post new ones |
| **Assignments** | The assignments with their status | Same, plus create new ones |
| **Modules** | "Coming soon" | "Coming soon" |
| **Grades** | **Only their own** grades in this course | A **gradebook**: every enrolled student × every assignment (click a cell to grade) |
| **People** | Names and roles | Names, roles **and emails** |

The public course list (linked from the login page) is at `/catalog`.

## Folder structure

```
Mini Canvas/
├── README.md
├── .gitignore
├── server/              Express API
│   ├── .env.example     Template for secret settings (copy to .env)
│   ├── .env.test.example Template for test settings (copy to .env.test)
│   ├── vitest.config.js Test settings
│   ├── migrations/      Numbered SQL files that create and change the tables (node-pg-migrate)
│   ├── db/
│   │   ├── runMigrations.js  Runs the migrations (used by db:migrate and the tests)
│   │   ├── migrate.js   "npm run db:migrate" / "npm run db:rollback"
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
│       └── routes/      API endpoints (auth, courses, assignments, submissions, grades, admin)
└── client/              React app (the part you see in the browser)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/          Static files (logo.png)
    └── src/
        ├── main.jsx     App starting point
        ├── App.jsx      Routes: which URL shows which page
        ├── styles.css   The design system: colors, layout, components
        ├── format.js    Shared helpers for dates, file sizes and statuses
        ├── api.js       Small helper for sending requests to the server
        ├── auth/        Shared "who is logged in" state (React Context)
        ├── components/  Reusable pieces (AppShell sidebar layout, cards, calendar, forms, RequireAuth...)
        └── pages/       One file per screen
```

## Design

- **Colors, sizes and shadows** are CSS variables at the top of `client/src/styles.css`. Change `--primary` and the whole app changes.
- **Layout:** a sidebar on desktop that becomes a slide-out menu (☰) on screens narrower than 900px.
- **Icons** come from [lucide-react](https://lucide.dev). The **Inter** font is bundled with the app (no outside requests).
- **Placeholders:** features that don't exist yet (announcements, study activity, schedule, search...) appear as **"Coming soon"** and never show made-up numbers.
- The logo is a dino mascot (`client/public/logo.png`, 256×256, also used as the browser tab icon). On blue backgrounds it sits on a white tile. The welcome illustration is our own simple SVG drawing.

## Running the app

Requires [Node.js](https://nodejs.org) (LTS, version 20.19 or newer, which Vite 8 needs) and [PostgreSQL](https://www.postgresql.org/download/) 18. You need **two terminals**: one for the server, one for the client.

**0. Database (first time only)**

1. Copy `server/.env.example` to `server/.env`. Set a long random `SESSION_SECRET` and choose a password for the app user in `DATABASE_URL`.
2. As the `postgres` superuser, create the app user and database (use the same password as in `DATABASE_URL`):

   ```sql
   CREATE ROLE mini_canvas_app LOGIN PASSWORD 'your-app-password';
   CREATE DATABASE mini_canvas OWNER mini_canvas_app;
   ```

3. Create the tables, then the demo data:

   ```bash
   cd server
   npm install
   npm run db:migrate
   npm run db:seed
   ```

   You can run `npm run db:seed` again any time. It **resets everything** (users, courses, assignments, submissions, uploaded files and logins) to the demo data, so anything added since is removed.

**Database changes (migrations)**

Tables are never changed by hand. Each change is a numbered SQL file in `server/migrations/` with an `-- Up Migration` part (make the change) and a `-- Down Migration` part (undo it). node-pg-migrate records which files have run in the `pgmigrations` table.

- `npm run db:migrate` applies new migrations. Run it after pulling changes that add one.
- `npm run db:rollback` undoes the most recent migration. **Careful:** this can delete data.
- Never edit a migration that has already run. Add a new one instead.

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
| Admin | admin@demo.test | Admin123! |

The demo data is **engineering-themed**:

| Course | Instructor | Demo student |
|---|---|---|
| **EE 101** Circuit Analysis 1 | instructor | enrolled |
| **CPE 201** Digital Logic Design | instructor | enrolled |
| **ECE 210** Signals and Systems | instructor | enrolled |
| **MATH 120** Differential Equations | instructor2 | **not** enrolled (to test that users can only open their own courses) |
| **ENGR 100** Engineering Drawing (last term) | instructor | enrolled, finished (only with `db:seed`) |

The seed also adds two example submissions from the demo student in EE 101: **Ohm's Law Problem Set** (already graded, 9/10) and **Kirchhoff's Laws Lab Report** (waiting for a grade).

## Submission rules

- Students upload one file per assignment. They can replace it any time **until it's graded**; after that it's locked.
- Late submissions are allowed and marked **Late**.
- Instructors grade on each assignment's page: a whole-number score from 0 to the assignment's points, plus optional feedback. Grades can be updated.
- The Grades page totals only count graded assignments.

## Assignment rules

- Only the instructor who **teaches** a course can add or edit its assignments (not other instructors, students or admins).
- Title (required), description, due date and time, and points (a whole number from 1 to 1000).
- Due dates are picked in your **local time**, sent to the server in **UTC**, and stored with the time zone, so everyone sees the right moment in their own time zone.
- Points can't be lowered below a grade already given (a 9/10 can't become 9/5).
- Assignments can't be deleted, because that would erase students' work.

## Announcement rules

- **Instructors** post to the courses they teach (from the course page). **Admins** post **site-wide** announcements for everyone (from the Users page).
- Everyone sees site-wide announcements plus those of **their own** courses: enrolled (students) or taught (instructors). Admins only see site-wide ones.
- The **author** can edit an announcement (it then shows **"Edited <date>"**, so readers know it changed) or delete it.
- Text is stored and shown as **plain text**. React never turns it into HTML, so a `<script>` in a message is harmless (no XSS).
- Lists show **compact cards** (title, 2-line preview, author, time, file and reply counts). **Click a card** to open the full announcement at `/announcements/:id`, which has the full text, attachments, replies, the reply box, **Mark as read / unread**, and Edit/Delete for the author.
- The dashboard shows the newest 5 **unread** ones; **Show read** brings read ones back. A course page shows all of that course's announcements.
- **Read / unread** is per person (stored in `announcement_reads`): marking one as read only changes it for you. Your own posts start as read.
- **Replies** work on course announcements only (not site-wide ones), are plain text, and are **visible to everyone in the course**. The reply's author or the course's instructor (moderation) can delete a reply.
- **Files:** up to **3 per announcement**, attached when posting, with the same rules as submissions (5 MB, allowed types, random names on disk). Only people who can see the announcement can download them. Deleting an announcement also deletes its replies and files. Editing changes the text only.

## Student dashboard: to-do list

- **Missing:** past the due date and nothing submitted.
- **Coming up:** due in the next **7 days** and not submitted yet, soonest first. Submitted work disappears from the list.
- The server decides what's in each list using the **database's clock**, so a student's wrong computer time can't change it.
- The seed includes one missing assignment (**Boolean Algebra Quiz**, CPE 201) so you can see it.

## Admin rules

- Admins create users. The server makes a random **temporary password**, shown to the admin **once**. The new user must change it at their first login; until then, the server blocks everything else.
- Users are **deactivated, never deleted**. A deactivated user is logged out immediately and can't log in. Admins can't deactivate themselves. A user's role can't be changed after creation.
- Admins create and edit courses and enroll or remove students. Removing a student **keeps** their submissions and grades. Courses can't be deleted.
- Admins **don't** automatically see inside courses (assignments, files, grades). That's least privilege: they only get what managing accounts needs.
- Every user can change their own password from the header.

## API endpoints

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/auth/login` | Anyone | Checks email + password, starts a session |
| POST | `/api/auth/logout` | Anyone | Ends the session |
| GET | `/api/auth/me` | Logged in | Returns the logged-in user, or 401 |
| POST | `/api/auth/change-password` | Logged in (also with a temporary password) | `{ currentPassword, newPassword }` |
| GET | `/api/courses` | Anyone | Public course catalog |
| GET | `/api/courses/mine` | Logged in | Student: enrolled courses. Instructor: courses they teach |
| GET | `/api/courses/:id` | Enrolled student or the course's instructor | Course details (incl. syllabus, student count) with its assignments (404 otherwise) |
| PUT | `/api/courses/:id/syllabus` | The course's **instructor** | Edit the syllabus text `{ syllabus }` |
| PUT / DELETE / GET | `/api/courses/:id/syllabus/file` | Instructor (PUT, DELETE) / anyone in the course (GET) | Upload or replace (form field `file`) / remove / download the syllabus file |
| GET | `/api/courses/:id/people` | Anyone in the course | Instructor + enrolled students (emails only for the instructor) |
| GET | `/api/courses/:id/grades` | Anyone in the course | Student: own grades. Instructor: gradebook `{ assignments, students, submissions }` |
| POST | `/api/courses/:id/assignments` | The course's **instructor** | Create `{ title, description, dueAt, points }` |
| GET | `/api/assignments/:id` | Enrolled student or the course's instructor | Assignment + my submission (student) or all submissions (instructor) |
| PUT | `/api/assignments/:id` | The course's **instructor** | Edit `{ title, description, dueAt, points }` |
| PUT | `/api/assignments/:id/submission` | Enrolled **student** | Upload or replace my file (form field `file`) |
| GET | `/api/submissions/:id/file` | That student or the course's instructor | Download the submitted file |
| PUT | `/api/submissions/:id/grade` | The course's **instructor** | Save `{ score, feedback }` |
| GET | `/api/grades` | **Student** | All my assignments and scores, by course |
| GET | `/api/upcoming` | **Student** | `{ days, missing, upcoming }`: my unsubmitted work |
| GET | `/api/search?q=ohm` | Logged in | Up to 5 each: `courses`, `assignments`, `announcements` (admins: `users`, `courses`) |
| GET | `/api/activity?tz=Asia/Manila` | **Student** | My 84-day submission counts + requirements |
| GET | `/api/courses/:id/students/:userId/activity?tz=...` | The course's **instructor** | That student's activity in this course only |
| GET | `/api/announcements` | Logged in | Newest 20: site-wide + my courses |
| GET / POST | `/api/courses/:id/announcements` | Can open the course / the course's **instructor** | List / post `title`, `body` + up to 3 `files` (multipart form) |
| POST | `/api/admin/announcements` | **Admin** | Post a site-wide announcement (same fields) |
| GET | `/api/announcements/:id` | Anyone who can see it | One announcement (for its own page) |
| PUT / DELETE | `/api/announcements/:id` | The **author** | Edit text (marked as edited) / delete (with replies and files) |
| PUT / DELETE | `/api/announcements/:id/read` | Anyone who can see it | Mark as read / unread (for me only) |
| GET / POST | `/api/announcements/:id/replies` | Anyone in the course | List replies / reply `{ body }` |
| DELETE | `/api/announcements/replies/:replyId` | Reply's author or the course's instructor | Delete a reply |
| GET | `/api/announcements/files/:fileId` | Anyone who can see the announcement | Download an attached file |
| GET / POST | `/api/admin/users` | **Admin** | List users / create one (returns a one-time temporary password) |
| PATCH | `/api/admin/users/:id` | **Admin** | `{ isActive }`: deactivate or reactivate |
| GET / POST | `/api/admin/courses` | **Admin** | List courses / create one |
| GET / PUT | `/api/admin/courses/:id` | **Admin** | Course with its students / edit it |
| PUT / DELETE | `/api/admin/courses/:id/students/:userId` | **Admin** | Enroll / remove a student |
