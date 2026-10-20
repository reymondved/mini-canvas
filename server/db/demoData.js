// The fake demo data, and a function that resets the database to it.
// Used by "npm run db:seed" (db/seed.js) and by the automated tests.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';
import { UPLOAD_DIR } from '../src/uploads.js';

// Fake demo accounts only. These passwords are hashed before they are saved.
const demoUsers = [
  { name: 'Demo Student', email: 'student@demo.test', password: 'Student123!', role: 'student' },
  { name: 'Demo Instructor', email: 'instructor@demo.test', password: 'Instructor123!', role: 'instructor' },
  { name: 'Demo Instructor Two', email: 'instructor2@demo.test', password: 'Instructor123!', role: 'instructor' },
  { name: 'Demo Admin', email: 'admin@demo.test', password: 'Admin123!', role: 'admin' },
];

// Each course lists its instructor, whether the demo student is enrolled, and its assignments.
// dueInDays: negative = already past, positive = upcoming (relative to when you run the seed).
const demoCourses = [
  {
    code: 'CS 101',
    title: 'Introduction to Programming',
    description: 'Variables, loops, and functions: the building blocks of every program.',
    instructor: 'instructor@demo.test',
    studentEnrolled: true,
    assignments: [
      {
        title: 'Hello, World',
        description: 'Write and run your first program.',
        dueInDays: -3,
        points: 10,
        // Example: already submitted by the demo student AND graded
        submission: {
          fileName: 'hello-world.txt',
          content: 'console.log("Hello, World!");\n',
          score: 9,
          feedback: 'Nice work! Add a comment at the top explaining what the program does.',
        },
      },
      {
        title: 'Loops Practice',
        description: 'Print the numbers 1 to 100 using a loop.',
        dueInDays: 4,
        points: 20,
        // Example: submitted, waiting for the instructor to grade it
        submission: {
          fileName: 'loops.txt',
          content: 'for (let i = 1; i <= 100; i++) {\n  console.log(i);\n}\n',
        },
      },
      { title: 'Functions Quiz', description: 'Short quiz on writing and calling functions.', dueInDays: 11, points: 30 },
    ],
  },
  {
    code: 'WEB 201',
    title: 'Web Development Fundamentals',
    description: 'Build web pages with HTML, CSS, and JavaScript.',
    instructor: 'instructor@demo.test',
    studentEnrolled: true,
    assignments: [
      { title: 'Personal Homepage', description: 'Build a one-page site about yourself using HTML and CSS.', dueInDays: 6, points: 50 },
      { title: 'Responsive Layout', description: 'Make your homepage work on phones and desktops.', dueInDays: 14, points: 50 },
      // Example: past due and NOT submitted, so it shows as "Missing" on the dashboard
      { title: 'HTML Basics Quiz', description: 'Short quiz on HTML tags and structure.', dueInDays: -1, points: 15 },
    ],
  },
  {
    code: 'DB 210',
    title: 'Database Systems',
    description: 'Design tables and write SQL queries to store and find data.',
    instructor: 'instructor@demo.test',
    studentEnrolled: true,
    assignments: [
      { title: 'Design a Schema', description: 'Draw the tables for a small library system.', dueInDays: 2, points: 40 },
      { title: 'SQL Queries', description: 'Write SELECT queries with WHERE and JOIN.', dueInDays: 9, points: 60 },
    ],
  },
  {
    code: 'MATH 120',
    title: 'Discrete Mathematics',
    description: 'Logic, sets, and counting for computer science.',
    instructor: 'instructor2@demo.test',
    studentEnrolled: false, // used to test that the demo student can't open this course
    assignments: [
      { title: 'Logic Worksheet', description: 'Truth tables and logical operators.', dueInDays: 5, points: 25 },
    ],
  },
];

// course: null = site-wide (for everyone). hoursAgo: how long ago it was posted.
const demoAnnouncements = [
  {
    course: null,
    author: 'admin@demo.test',
    title: 'Midterm exam week: Oct 26–30',
    body: 'Midterm exams run from October 26 to 30. Check each course page for your exam time and room.',
    hoursAgo: 30,
  },
  {
    course: 'CS 101',
    author: 'instructor@demo.test',
    title: 'CS 101 midterm: Oct 27, 9:00–11:00',
    body: 'The midterm covers variables, loops and functions. Room 204. Bring a pencil; no laptops.',
    hoursAgo: 20,
  },
  {
    course: 'WEB 201',
    author: 'instructor@demo.test',
    title: 'Lab moved to Thursday',
    body: "This week's lab moves from Wednesday to Thursday, same time.",
    hoursAgo: 5,
  },
  {
    // The demo student is NOT in MATH 120, so they must never see this one.
    course: 'MATH 120',
    author: 'instructor2@demo.test',
    title: 'MATH 120 quiz on Friday',
    body: 'Short quiz on truth tables.',
    hoursAgo: 2,
  },
];

// RESETS all data to the demo data above: users (including ones an admin created),
// courses, enrollments, assignments, submissions, announcements, uploaded files, and logins.
// The tables must already exist: run "npm run db:migrate" first.
// log: where progress messages go (tests pass a function that ignores them).
export async function seedDemoData({ log = console.log } = {}) {
  // Start fresh. CASCADE also empties every table that points at users or courses,
  // and RESTART IDENTITY makes the ids start at 1 again (the tests rely on that).
  await pool.query('TRUNCATE users, courses, session RESTART IDENTITY CASCADE');
  // The submission rows are gone, so remove their files too (only inside the upload folder).
  await rm(UPLOAD_DIR, { recursive: true, force: true });
  await mkdir(UPLOAD_DIR, { recursive: true });

  // --- Users ---
  const userIds = {}; // email → id, so courses can point at the right users
  for (const user of demoUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    // $1, $2... are placeholders. pg sends the values separately from the SQL,
    // so user data can never change the query itself (this prevents SQL injection).
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [user.name, user.email, passwordHash, user.role]
    );
    userIds[user.email] = result.rows[0].id;
    log(`Seeded ${user.role}: ${user.email}`);
  }

  // --- Courses, enrollments, assignments ---
  const courseIds = {}; // code → id, so announcements can point at the right course

  for (const course of demoCourses) {
    const result = await pool.query(
      'INSERT INTO courses (code, title, description, instructor_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [course.code, course.title, course.description, userIds[course.instructor]]
    );
    const courseId = result.rows[0].id;
    courseIds[course.code] = courseId;

    if (course.studentEnrolled) {
      await pool.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [
        userIds['student@demo.test'],
        courseId,
      ]);
    }

    for (const a of course.assignments) {
      const assignmentResult = await pool.query(
        `INSERT INTO assignments (course_id, title, description, due_at, points)
         VALUES ($1, $2, $3, now() + make_interval(days => $4), $5)
         RETURNING id`,
        [courseId, a.title, a.description, a.dueInDays, a.points]
      );

      if (a.submission) {
        // Write the example file to disk under a random name, like a real upload.
        const storedName = randomUUID();
        await writeFile(path.join(UPLOAD_DIR, storedName), a.submission.content);
        await pool.query(
          `INSERT INTO submissions
             (assignment_id, student_id, file_name, stored_name, file_type, file_size, score, feedback, graded_at)
           VALUES ($1, $2, $3, $4, 'text/plain', $5, $6, $7, CASE WHEN $6::int IS NULL THEN NULL ELSE now() END)`,
          [
            assignmentResult.rows[0].id,
            userIds['student@demo.test'],
            a.submission.fileName,
            storedName,
            Buffer.byteLength(a.submission.content),
            a.submission.score ?? null,
            a.submission.feedback ?? null,
          ]
        );
      }
    }
    log(`Seeded course: ${course.code} (${course.assignments.length} assignments)`);
  }

  // --- Announcements ---
  for (const a of demoAnnouncements) {
    await pool.query(
      `INSERT INTO announcements (course_id, author_id, title, body, created_at)
       VALUES ($1, $2, $3, $4, now() - make_interval(hours => $5))`,
      [a.course ? courseIds[a.course] : null, userIds[a.author], a.title, a.body, a.hoursAgo]
    );
  }
  log(`Seeded ${demoAnnouncements.length} announcements`);
}
