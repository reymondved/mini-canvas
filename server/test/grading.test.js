import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  IDS,
  INSTRUCTOR,
  INSTRUCTOR_2,
  STUDENT,
  fileForm,
  login,
  request,
  startTestServer,
  stopTestServer,
} from './helpers.js';

let student;
let instructor;
let instructor2;

beforeAll(async () => {
  await startTestServer();
  student = await login(STUDENT);
  instructor = await login(INSTRUCTOR);
  instructor2 = await login(INSTRUCTOR_2);
});
afterAll(stopTestServer);

// "Kirchhoff's Laws Lab Report" is worth 20 points and is waiting for a grade.
const gradeUrl = `/api/submissions/${IDS.submissions.kirchhoffUngraded}/grade`;

describe('who may grade', () => {
  test('a student CANNOT grade (instructors only) → 403', async () => {
    const res = await request(gradeUrl, { method: 'PUT', cookie: student, json: { score: 20 } });
    expect(res.status).toBe(403);
  });

  test("an instructor CANNOT grade another instructor's course → 404", async () => {
    const res = await request(gradeUrl, { method: 'PUT', cookie: instructor2, json: { score: 20 } });
    expect(res.status).toBe(404);
  });
});

describe('score checks', () => {
  test.each([
    ['above the max points', 25],
    ['negative', -1],
    ['a decimal', 7.5],
    ['text instead of a number', '18'],
    ['missing', undefined],
  ])('rejects a score that is %s', async (_label, score) => {
    const res = await request(gradeUrl, { method: 'PUT', cookie: instructor, json: { score } });
    expect(res.status).toBe(400);
  });

  test('rejects feedback longer than 2000 characters', async () => {
    const res = await request(gradeUrl, {
      method: 'PUT',
      cookie: instructor,
      json: { score: 10, feedback: 'x'.repeat(2001) },
    });
    expect(res.status).toBe(400);
  });
});

describe('grading flow', () => {
  test('the instructor saves a grade, and the student sees it on their grades page', async () => {
    const graded = await request(gradeUrl, {
      method: 'PUT',
      cookie: instructor,
      json: { score: 18, feedback: 'Clear measurements!' },
    });
    expect(graded.status).toBe(200);
    expect(graded.body.submission.score).toBe(18);

    const grades = await request('/api/grades', { cookie: student });
    const ee101 = grades.body.courses.find((c) => c.code === 'EE 101');
    const kirchhoffLab = ee101.assignments.find((a) => a.title === "Kirchhoff's Laws Lab Report");
    expect(kirchhoffLab.score).toBe(18);
    expect(kirchhoffLab.feedback).toBe('Clear measurements!');
  });

  test('once graded, the student can no longer replace the file', async () => {
    const res = await request(`/api/assignments/${IDS.assignments.kirchhoffLab}/submission`, {
      method: 'PUT',
      cookie: student,
      form: fileForm('change.txt', 'late change', 'text/plain'),
    });
    expect(res.status).toBe(409);
  });
});

describe('grades page', () => {
  test('is for students only', async () => {
    const res = await request('/api/grades', { cookie: instructor });
    expect(res.status).toBe(403);
  });

  test("lists only the student's own courses", async () => {
    const res = await request('/api/grades', { cookie: student });
    expect(res.body.courses.map((c) => c.code)).toEqual(['CPE 201', 'ECE 210', 'EE 101']);
  });
});
