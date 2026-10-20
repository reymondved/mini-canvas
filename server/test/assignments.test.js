import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  ADMIN,
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
let admin;

beforeAll(async () => {
  await startTestServer();
  student = await login(STUDENT);
  instructor = await login(INSTRUCTOR);
  instructor2 = await login(INSTRUCTOR_2);
  admin = await login(ADMIN);
});
afterAll(stopTestServer);

const createUrl = `/api/courses/${IDS.courses.cs101}/assignments`;
// 23:59 Philippine time (UTC+8) on 5 November 2026.
const newAssignment = {
  title: 'Arrays Practice',
  description: 'Store 5 numbers in an array and print their sum.',
  dueAt: '2026-11-05T23:59:00+08:00',
  points: 25,
};

describe('who may create assignments', () => {
  test.each([
    ['not logged in', () => undefined, 401],
    ['a student', () => student, 403],
    ['an admin', () => admin, 403],
    ["an instructor who doesn't teach the course", () => instructor2, 404],
  ])('%s → blocked', async (_label, who, expected) => {
    const res = await request(createUrl, { method: 'POST', cookie: who(), json: newAssignment });
    expect(res.status).toBe(expected);
  });
});

describe('creating an assignment', () => {
  test.each([
    ['no title', { title: '' }],
    ['a date without a time zone', { dueAt: '2026-11-05T23:59' }],
    ['a date that is not a date', { dueAt: 'next friday' }],
    ['0 points', { points: 0 }],
    ['too many points', { points: 1001 }],
    ['points as text', { points: '25' }],
  ])('rejects %s', async (_label, change) => {
    const res = await request(createUrl, { method: 'POST', cookie: instructor, json: { ...newAssignment, ...change } });
    expect(res.status).toBe(400);
  });

  test("the course's instructor creates it, and the time zone is kept correctly", async () => {
    const res = await request(createUrl, { method: 'POST', cookie: instructor, json: newAssignment });
    expect(res.status).toBe(201);
    expect(res.body.assignment.title).toBe('Arrays Practice');
    // 23:59 in Manila (UTC+8) is 15:59 in UTC, the same moment in time.
    expect(res.body.assignment.due_at).toBe('2026-11-05T15:59:00.000Z');
  });

  test('enrolled students see the new assignment on the course page and grades page', async () => {
    const course = await request(`/api/courses/${IDS.courses.cs101}`, { cookie: student });
    expect(course.body.assignments.map((a) => a.title)).toContain('Arrays Practice');

    const grades = await request('/api/grades', { cookie: student });
    const cs101 = grades.body.courses.find((c) => c.code === 'CS 101');
    expect(cs101.assignments.map((a) => a.title)).toContain('Arrays Practice');
  });
});

describe('editing an assignment', () => {
  const editUrl = `/api/assignments/${IDS.assignments.functionsQuiz}`;
  const edited = {
    title: 'Functions Quiz (updated)',
    description: 'Now with arrow functions.',
    dueAt: '2026-12-01T12:00:00Z',
    points: 40,
  };

  test.each([
    ['a student', () => student, 403],
    ["an instructor who doesn't teach the course", () => instructor2, 404],
  ])('%s cannot edit → blocked', async (_label, who, expected) => {
    const res = await request(editUrl, { method: 'PUT', cookie: who(), json: edited });
    expect(res.status).toBe(expected);
  });

  test("the course's instructor can edit it", async () => {
    const res = await request(editUrl, { method: 'PUT', cookie: instructor, json: edited });
    expect(res.status).toBe(200);
    expect(res.body.assignment.title).toBe('Functions Quiz (updated)');
    expect(res.body.assignment.points).toBe(40);
  });

  test('points cannot drop below a grade already given', async () => {
    // "Hello, World" was graded 9 out of 10.
    const res = await request(`/api/assignments/${IDS.assignments.helloWorld}`, {
      method: 'PUT',
      cookie: instructor,
      json: { ...edited, title: 'Hello, World', points: 5 },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lower than a grade/);
  });

  test('points equal to the highest grade are fine', async () => {
    const res = await request(`/api/assignments/${IDS.assignments.helloWorld}`, {
      method: 'PUT',
      cookie: instructor,
      json: { ...edited, title: 'Hello, World', points: 9 },
    });
    expect(res.status).toBe(200);
  });
});
