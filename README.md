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
- [ ] **Phase 2** – Express backend with login and logout endpoints
- [ ] **Phase 3** – PostgreSQL database, real authentication, student and instructor roles
- [ ] **Phase 4** – Student dashboard and course pages with assignments
- [ ] **Phase 5** – Assignment submission, grading, and a grades page

## Folder structure

```
Mini Canvas/
├── README.md
├── .gitignore
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

## Running the frontend

Requires [Node.js](https://nodejs.org) (LTS version).

```bash
cd client
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.
