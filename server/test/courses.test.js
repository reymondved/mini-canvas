import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  IDS,
  INSTRUCTOR,
  INSTRUCTOR_2,
  STUDENT,
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

const codes = (res) => res.body.courses.map((c) => c.code);

describe('course catalog', () => {
  test('anyone can browse all courses', async () => {
    const res = await request('/api/courses');
    expect(res.status).toBe(200);
    expect(codes(res)).toEqual(['CPE 201', 'ECE 210', 'EE 101', 'MATH 120']);
  });
});

describe('my courses', () => {
  test('requires a login', async () => {
    const res = await request('/api/courses/mine');
    expect(res.status).toBe(401);
  });

  test('a student sees only the courses they are enrolled in', async () => {
    const res = await request('/api/courses/mine', { cookie: student });
    expect(codes(res)).toEqual(['CPE 201', 'ECE 210', 'EE 101']);
  });

  test('an instructor sees only the courses they teach', async () => {
    expect(codes(await request('/api/courses/mine', { cookie: instructor }))).toEqual(['CPE 201', 'ECE 210', 'EE 101']);
    expect(codes(await request('/api/courses/mine', { cookie: instructor2 }))).toEqual(['MATH 120']);
  });
});

describe('progress numbers for the dashboard', () => {
  test("a student sees how many of each course's assignments they submitted", async () => {
    const res = await request('/api/courses/mine', { cookie: student });
    const ee101 = res.body.courses.find((c) => c.code === 'EE 101');
    // EE 101 has 3 assignments; the demo student submitted 2 (Ohm's Law Problem Set and Kirchhoff's Laws Lab Report).
    expect(ee101).toMatchObject({ assignment_count: 3, submitted_count: 2 });
  });

  test('an instructor sees how many submissions are waiting for a grade', async () => {
    const res = await request('/api/courses/mine', { cookie: instructor });
    const ee101 = res.body.courses.find((c) => c.code === 'EE 101');
    // Kirchhoff's Laws Lab Report is submitted but not graded yet.
    expect(ee101).toMatchObject({ assignment_count: 3, to_grade_count: 1 });
  });
});

describe('opening one course (authorization)', () => {
  test('an enrolled student can open it and see its assignments', async () => {
    const res = await request(`/api/courses/${IDS.courses.ee101}`, { cookie: student });
    expect(res.status).toBe(200);
    expect(res.body.assignments).toHaveLength(3);
  });

  test('a student CANNOT open a course they are not enrolled in', async () => {
    const res = await request(`/api/courses/${IDS.courses.math120}`, { cookie: student });
    expect(res.status).toBe(404);
  });

  test("an instructor CANNOT open another instructor's course", async () => {
    const res = await request(`/api/courses/${IDS.courses.ee101}`, { cookie: instructor2 });
    expect(res.status).toBe(404);
  });

  test('"not yours" and "does not exist" look exactly the same', async () => {
    const notYours = await request(`/api/courses/${IDS.courses.math120}`, { cookie: student });
    const missing = await request('/api/courses/999', { cookie: student });
    expect(notYours.body).toEqual(missing.body);
  });

  test('a non-number id is simply not found', async () => {
    const res = await request('/api/courses/abc', { cookie: student });
    expect(res.status).toBe(404);
  });
});
