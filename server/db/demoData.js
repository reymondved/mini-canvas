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
// The ORDER matters: the tests rely on the ids it produces (courses 1–4, assignments 1–9).
const demoCourses = [
  {
    code: 'EE 101',
    title: 'Circuit Analysis 1',
    description: "Voltage, current and resistance: Ohm's law, Kirchhoff's laws and network theorems for DC circuits.",
    instructor: 'instructor@demo.test',
    studentEnrolled: true,
    syllabus: [
      'Course goals',
      "By the end of this course you can analyze DC circuits using Ohm's law, Kirchhoff's laws (KVL and KCL),",
      'mesh and nodal analysis, and Thevenin and Norton equivalents.',
      '',
      'Grading',
      '- Problem sets and quizzes: 30%',
      '- Laboratory reports: 30%',
      '- Midterm exam: 20%',
      '- Final exam: 20%',
      '',
      'Laboratory',
      'Lab reports are due one week after each experiment. Bring your own multimeter and breadboard.',
      '',
      'Late work',
      'Late submissions are accepted but marked Late. Talk to me if you need more time.',
    ].join('\n'),
    assignments: [
      {
        title: "Ohm's Law Problem Set",
        description: 'Solve 10 problems on voltage, current, resistance and power in series and parallel circuits.',
        dueInDays: -3,
        points: 10,
        allowedTypes: ['file', 'text'],
        // Example: already submitted by the demo student AND graded
        submission: {
          fileName: 'ohms-law-problem-set.txt',
          content: 'Problem 1: V = I x R = 2 A x 5 ohms = 10 V\nProblem 2: P = V x I = 12 V x 0.5 A = 6 W\n',
          score: 9,
          feedback: 'Good work! Remember to include units in every final answer.',
        },
      },
      {
        title: "Kirchhoff's Laws Lab Report",
        description: 'Measure the currents and voltages in the lab circuit and verify KVL and KCL.',
        dueInDays: 4,
        points: 20,
        allowedTypes: ['file', 'url'],
        // Example: submitted, waiting for the instructor to grade it
        submission: {
          fileName: 'kirchhoff-lab-report.txt',
          url: 'https://example.com/demo-student/kirchhoff-lab-data',
          content: 'KCL at node A: I1 = I2 + I3 -> 15 mA = 10 mA + 5 mA (verified)\nKVL around loop 1: 12 V - 7 V - 5 V = 0 (verified)\n',
        },
      },
      {
        title: 'Thevenin Equivalent Quiz',
        description: 'Short quiz: find the Thevenin voltage and resistance of three circuits.',
        dueInDays: 11,
        points: 30,
        allowedTypes: ['file', 'text'],
      },
    ],
  },
  {
    code: 'CPE 201',
    title: 'Digital Logic Design',
    description: 'Number systems, Boolean algebra, logic gates and combinational circuit design.',
    instructor: 'instructor@demo.test',
    studentEnrolled: true,
    assignments: [
      {
        title: 'Logic Gates Worksheet',
        description: 'Draw the truth tables and symbols of AND, OR, NOT, NAND, NOR and XOR gates.',
        dueInDays: 6,
        points: 50,
        allowedTypes: ['file'],
      },
      {
        title: 'Karnaugh Map Exercise',
        description: 'Simplify five Boolean functions using K-maps and draw the simplified circuits.',
        dueInDays: 14,
        points: 50,
        allowedTypes: ['file', 'text'],
      },
      // Example: past due and NOT submitted, so it shows as "Missing" on the dashboard
      {
        title: 'Boolean Algebra Quiz',
        description: "Short quiz on Boolean laws and De Morgan's theorems.",
        dueInDays: -1,
        points: 15,
        allowedTypes: ['text'],
      },
    ],
  },
  {
    code: 'ECE 210',
    title: 'Signals and Systems',
    description: 'Continuous and discrete-time signals, convolution, and the Fourier series and transform.',
    instructor: 'instructor@demo.test',
    studentEnrolled: true,
    assignments: [
      {
        title: 'Fourier Series Problem Set',
        description: 'Find the Fourier series of a square wave and a sawtooth wave.',
        dueInDays: 2,
        points: 40,
        allowedTypes: ['file', 'text'],
      },
      {
        title: 'Convolution Lab',
        description: 'Use MATLAB or Python to convolve two signals and compare with your hand calculation.',
        dueInDays: 9,
        points: 60,
        allowedTypes: ['file', 'url'],
      },
    ],
  },
  {
    code: 'MATH 120',
    title: 'Differential Equations',
    description: 'First and second-order ordinary differential equations and their engineering applications.',
    instructor: 'instructor2@demo.test',
    studentEnrolled: false, // used to test that the demo student can't open this course
    assignments: [
      {
        title: 'First-Order ODE Worksheet',
        description: 'Solve separable and linear first-order equations, including an RC circuit example.',
        dueInDays: 5,
        points: 25,
        allowedTypes: ['file'],
      },
    ],
  },
];

// course: null = site-wide (for everyone). hoursAgo: how long ago it was posted.
// files and replies are optional examples (replies are posted one hour apart, after the announcement).
const demoAnnouncements = [
  {
    course: null,
    author: 'admin@demo.test',
    title: 'Midterm exam week: Oct 26–30',
    body: 'Midterm exams run from October 26 to 30. Check each course page for your exam time and room.',
    hoursAgo: 30,
  },
  {
    course: 'EE 101',
    author: 'instructor@demo.test',
    title: 'EE 101 midterm: Oct 27, 9:00–11:00',
    body: "The midterm covers Ohm's law, Kirchhoff's laws (KVL and KCL) and Thevenin equivalents.\nRoom EN-204. Bring a scientific calculator; no phones.",
    hoursAgo: 20,
    files: [
      {
        fileName: 'midterm-coverage.txt',
        content:
          "EE 101 midterm coverage\n- Ohm's law and power\n- Series and parallel resistors\n- Kirchhoff's laws (KVL, KCL)\n- Thevenin and Norton equivalents\n",
      },
    ],
    replies: [
      { author: 'student@demo.test', body: 'Is it open notes?' },
      { author: 'instructor@demo.test', body: 'No, closed notes. You may bring one formula sheet.' },
    ],
  },
  {
    course: 'CPE 201',
    author: 'instructor@demo.test',
    title: 'Lab moved to Thursday',
    body: "This week's logic lab moves from Wednesday to Thursday, same time, Room EN-305. Bring your breadboard.",
    hoursAgo: 5,
  },
  {
    // The demo student is NOT in MATH 120, so they must never see this one.
    course: 'MATH 120',
    author: 'instructor2@demo.test',
    title: 'MATH 120 quiz on Friday',
    body: 'Short quiz on separable first-order equations.',
    hoursAgo: 2,
  },
];

// RESETS all data to the demo data above: users (including ones an admin created),
// courses, enrollments, assignments, submissions, announcements, uploaded files, and logins.
// The tables must already exist: run "npm run db:migrate" first.
// log: where progress messages go (tests pass a function that ignores them).
// withHistory: also add a finished past course with weekly submissions, so the Study activity
// heatmap has something to show. The tests turn it off, so their numbers stay small and exact.
export async function seedDemoData({ log = console.log, withHistory = true } = {}) {
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
      'INSERT INTO courses (code, title, description, instructor_id, syllabus) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [course.code, course.title, course.description, userIds[course.instructor], course.syllabus ?? '']
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
        `INSERT INTO assignments (course_id, title, description, due_at, points, allowed_types)
         VALUES ($1, $2, $3, now() + make_interval(days => $4), $5, $6)
         RETURNING id`,
        [courseId, a.title, a.description, a.dueInDays, a.points, a.allowedTypes]
      );

      if (a.submission) {
        // Write the example file to disk under a random name, like a real upload.
        const storedName = randomUUID();
        await writeFile(path.join(UPLOAD_DIR, storedName), a.submission.content);
        await pool.query(
          `INSERT INTO submissions
             (assignment_id, student_id, file_name, stored_name, file_type, file_size, url, score, feedback, graded_at)
           VALUES ($1, $2, $3, $4, 'text/plain', $5, $6, $7, $8, CASE WHEN $7::int IS NULL THEN NULL ELSE now() END)`,
          [
            assignmentResult.rows[0].id,
            userIds['student@demo.test'],
            a.submission.fileName,
            storedName,
            Buffer.byteLength(a.submission.content),
            a.submission.url ?? null,
            a.submission.score ?? null,
            a.submission.feedback ?? null,
          ]
        );
      }
    }
    log(`Seeded course: ${course.code} (${course.assignments.length} assignments)`);
  }

  // --- Announcements (+ the author's own "read" mark, example files and replies) ---
  for (const a of demoAnnouncements) {
    const result = await pool.query(
      `INSERT INTO announcements (course_id, author_id, title, body, created_at)
       VALUES ($1, $2, $3, $4, now() - make_interval(hours => $5))
       RETURNING id`,
      [a.course ? courseIds[a.course] : null, userIds[a.author], a.title, a.body, a.hoursAgo]
    );
    const announcementId = result.rows[0].id;
    await pool.query('INSERT INTO announcement_reads (user_id, announcement_id) VALUES ($1, $2)', [
      userIds[a.author],
      announcementId,
    ]);

    for (const file of a.files ?? []) {
      const storedName = randomUUID();
      await writeFile(path.join(UPLOAD_DIR, storedName), file.content);
      await pool.query(
        `INSERT INTO announcement_files (announcement_id, file_name, stored_name, file_type, file_size)
         VALUES ($1, $2, $3, 'text/plain', $4)`,
        [announcementId, file.fileName, storedName, Buffer.byteLength(file.content)]
      );
    }

    for (const [i, reply] of (a.replies ?? []).entries()) {
      await pool.query(
        `INSERT INTO announcement_replies (announcement_id, author_id, body, created_at)
         VALUES ($1, $2, $3, now() - make_interval(hours => $4))`,
        [announcementId, userIds[reply.author], reply.body, a.hoursAgo - i - 1]
      );
    }
  }
  log(`Seeded ${demoAnnouncements.length} announcements`);

  if (withHistory) {
    await seedPastCourse(userIds, log);
  }
}

// A course from "last term": 11 weekly drawing plates and a quiz every other week, mostly
// submitted the day before they were due. Week 5's plate was late and week 8's quiz was missed.
async function seedPastCourse(userIds, log) {
  const course = await pool.query(
    `INSERT INTO courses (code, title, description, instructor_id)
     VALUES ('ENGR 100', 'Engineering Drawing (last term)',
             'Orthographic and isometric projection, dimensioning and basic CAD.', $1)
     RETURNING id`,
    [userIds['instructor@demo.test']]
  );
  const courseId = course.rows[0].id;
  const studentId = userIds['student@demo.test'];
  await pool.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [studentId, courseId]);

  let count = 0;
  for (let week = 1; week <= 11; week++) {
    const dueInDays = -80 + 7 * week; // from 73 days ago up to 3 days ago
    const items = [{ title: `Week ${week} plate`, points: 10, lateDays: week === 5 ? 1 : 0 }];
    if (week % 2 === 0) {
      items.push({ title: `Week ${week} quiz`, points: 20, skip: week === 8 });
    }
    for (const item of items) {
      const assignment = await pool.query(
        `INSERT INTO assignments (course_id, title, description, due_at, points)
         VALUES ($1, $2, 'Weekly drawing work from last term.', date_trunc('day', now()) + make_interval(days => $3, hours => 23, mins => 59), $4)
         RETURNING id`,
        [courseId, item.title, dueInDays, item.points]
      );
      if (item.skip) continue; // missed: nothing submitted

      // Submitted the evening before the due date (or a day late), and graded.
      const storedName = randomUUID();
      const content = `${item.title}: my answers\n`;
      await writeFile(path.join(UPLOAD_DIR, storedName), content);
      await pool.query(
        `INSERT INTO submissions
           (assignment_id, student_id, file_name, stored_name, file_type, file_size, submitted_at, score, graded_at)
         VALUES ($1, $2, $3, $4, 'text/plain', $5,
                 date_trunc('day', now()) + make_interval(days => $6, hours => 20), $7, now())`,
        [
          assignment.rows[0].id,
          studentId,
          `${item.title.toLowerCase().replaceAll(' ', '-')}.txt`,
          storedName,
          Buffer.byteLength(content),
          dueInDays - 1 + (item.lateDays ?? 0) * 2, // late = the evening after the due date
          Math.round(item.points * 0.85),
        ]
      );
      count++;
    }
  }
  log(`Seeded past course: ENGR 100 (${count} submissions for the activity heatmap)`);
}
