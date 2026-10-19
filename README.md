# Mini Canvas — HAU LMS Demo

> **Demo – not the official HAU system.**
> This is a private practice/portfolio project inspired by a school learning management system.
> It is not affiliated with or endorsed by Holy Angel University.

## Project rules

- The repository stays **private** and the app is **not deployed publicly**.
- Only **fake test accounts** are used. Never enter real student credentials.
- Passwords are always **hashed** (from Phase 3 on), never stored in plain text.

## Stack

| Part | Technology |
|---|---|
| Frontend | React + Vite (JavaScript, plain CSS) |
| Backend | Node.js + Express *(Phase 2)* |
| Database | PostgreSQL *(Phase 3)* |
| Login persistence | Sessions with cookies *(Phase 2–3)* |

## Roadmap

- [x] **Phase 1** – Login page with validation, Forgot Password and Browse Courses pages
- [x] **Phase 2** – Express backend with login and logout endpoints
- [ ] **Phase 3** – PostgreSQL database, real authentication, student and instructor roles
- [ ] **Phase 4** – Student dashboard and course pages with assignments
- [ ] **Phase 5** – Assignment submission, grading, and a grades page

## Folder structure

```
Mini Canvas/
├── README.md
├── .gitignore
├── server/              Express API (login, logout, sessions)
│   ├── .env.example     Template for secret settings (copy to .env)
│   └── src/
│       ├── index.js     Starts the server, sets up sessions
│       ├── routes/      API endpoints
│       └── data/        Fake demo users (replaced by PostgreSQL in Phase 3)
└── client/              React app (the part you see in the browser)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/          Static files (logo)
    └── src/
        ├── main.jsx     App starting point
        ├── App.jsx      Routes: which URL shows which page
        ├── styles.css   Colors and layout
        ├── components/  Reusable pieces (demo banner)
        ├── pages/       One file per screen
        └── data/        Fake demo data
```

## Running the app

Requires [Node.js](https://nodejs.org) (LTS version). You need **two terminals**: one for the server, one for the client.

**1. Server** (first time only: copy `server/.env.example` to `server/.env` and set a long random `SESSION_SECRET`)

```bash
cd server
npm install
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

## API endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/api/auth/login` | Checks email + password, starts a session |
| POST | `/api/auth/logout` | Ends the session |
| GET | `/api/auth/me` | Returns the logged-in user, or 401 |
