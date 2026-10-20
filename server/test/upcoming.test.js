import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  ADMIN,
  IDS,
  INSTRUCTOR,
  STUDENT,
  fileForm,
  login,
  request,
  startTestServer,
  stopTestServer,
} from './helpers.js';

let student;
let instructor;
let admin;

beforeAll(async () => {
  await startTestServer();
  student = await login(STUDENT);
  instructor = await login(INSTRUCTOR);
  admin = await login(ADMIN);
});
afterAll(stopTestServer);

const titles = (list) => list.map((a) => a.title);

// What the demo student has (due dates are relative to when the seed ran):
//   Ohm's Law Problem Set      -3 days  submitted + graded   â†’ neither list
//   Boolean Algebra Quiz  -1 day   not submitted        â†’ MISSING
//   Fourier Series Problem Set   +2 days  not submitted        â†’ upcoming
//   Kirchhoff's Laws Lab Report    +4 days  submitted            â†’ neither list
//   Logic Gates Worksheet +6 days  not submitted        â†’ upcoming
//   Convolution Lab       +9 days  not submitted        â†’ too far away
//   First-Order ODE Worksheet   +5 days  MATH 120, not enrolled â†’ never

describe('who may see the upcoming list', () => {
  test.each([
    ['not logged in', () => undefined, 401],
    ['an instructor', () => instructor, 403],
    ['an admin', () => admin, 403],
  ])('%s â†’ blocked', async (_label, who, expected) => {
    expect((await request('/api/upcoming', { cookie: who() })).status).toBe(expected);
  });
});

describe("the student's to-do list", () => {
  test('missing = past due AND not submitted (graded work is not missing)', async () => {
    const res = await request('/api/upcoming', { cookie: student });
    expect(res.status).toBe(200);
    expect(titles(res.body.missing)).toEqual(['Boolean Algebra Quiz']);
  });

  test('upcoming = due in the next 7 days and not submitted, soonest first', async () => {
    const res = await request('/api/upcoming', { cookie: student });
    expect(res.body.days).toBe(7);
    expect(titles(res.body.upcoming)).toEqual(['Fourier Series Problem Set', 'Logic Gates Worksheet']);
  });

  test('never includes courses the student is not enrolled in', async () => {
    const res = await request('/api/upcoming', { cookie: student });
    const all = [...res.body.missing, ...res.body.upcoming];
    expect(all.map((a) => a.course_code)).not.toContain('MATH 120');
  });

  test('submitting an assignment removes it from the list', async () => {
    const upload = await request(`/api/assignments/${IDS.assignments.fourier}/submission`, {
      method: 'PUT',
      cookie: student,
      form: fileForm('fourier-series.txt', 'a0 = 0, an = 0, bn = 4/(n*pi) for odd n', 'text/plain'),
    });
    expect(upload.status).toBe(200);

    const res = await request('/api/upcoming', { cookie: student });
    expect(titles(res.body.upcoming)).toEqual(['Logic Gates Worksheet']);
  });

  test('a new assignment due in 3 days shows up right away', async () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await request(`/api/courses/${IDS.courses.ee101}/assignments`, {
      method: 'POST',
      cookie: instructor,
      json: { title: 'Pop Quiz', description: '', dueAt: inThreeDays, points: 5 },
    });

    const res = await request('/api/upcoming', { cookie: student });
    expect(titles(res.body.upcoming)).toEqual(['Pop Quiz', 'Logic Gates Worksheet']);
  });
});
