import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { pool } from '../src/db.js';
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

// The seed (without history): the demo student submitted "Ohm's Law Problem Set" (late) and "Kirchhoff's Laws Lab Report"
// (on time) just now, and missed "Boolean Algebra Quiz" (CPE 201).
const dayCount = (body, date) => body.days.find((d) => d.date === date)?.count;

describe('my own activity', () => {
  test.each([
    ['not logged in', () => undefined, 401],
    ['an instructor (students only)', () => instructor, 403],
    ['an admin', () => admin, 403],
  ])('%s → blocked', async (_label, who, expected) => {
    expect((await request('/api/activity', { cookie: who() })).status).toBe(expected);
  });

  test('84 days (12 weeks), one entry per day, oldest first', async () => {
    const res = await request('/api/activity?tz=UTC', { cookie: student });
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(84);
    const dates = res.body.days.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
  });

  test("today's two submissions are counted", async () => {
    const res = await request('/api/activity?tz=UTC', { cookie: student });
    expect(res.body.days.at(-1).count).toBe(2);
  });

  test('requirements: on time, late and missing', async () => {
    const res = await request('/api/activity?tz=UTC', { cookie: student });
    expect(res.body.requirements).toEqual({ on_time: 1, late: 1, missing: 1 });
  });

  test('an unknown time zone is rejected', async () => {
    expect((await request('/api/activity?tz=Mars/Olympus', { cookie: student })).status).toBe(400);
  });

  test('days follow YOUR time zone: 22:00 UTC is already the next morning in Manila', async () => {
    // Move "Ohm's Law Problem Set" to yesterday 22:00 UTC (= today 06:00 in Manila, UTC+8).
    await pool.query(
      `UPDATE submissions
       SET submitted_at = (((now() AT TIME ZONE 'UTC')::date)::timestamp - interval '2 hours') AT TIME ZONE 'UTC'
       WHERE id = $1`,
      [IDS.submissions.ohmsLawGraded]
    );
    const { rows } = await pool.query(
      `SELECT to_char((now() AT TIME ZONE 'UTC')::date - 1, 'YYYY-MM-DD') AS yesterday_utc`
    );

    const inUtc = await request('/api/activity?tz=UTC', { cookie: student });
    const inManila = await request('/api/activity?tz=Asia/Manila', { cookie: student });
    expect(dayCount(inUtc.body, rows[0].yesterday_utc)).toBe(1);
    expect(dayCount(inManila.body, rows[0].yesterday_utc)).toBe(0);
  });
});

describe("an instructor viewing a student's activity", () => {
  const url = (courseId, userId) => `/api/courses/${courseId}/students/${userId}/activity?tz=UTC`;

  test('the course instructor sees it, limited to THEIR course', async () => {
    const res = await request(url(IDS.courses.ee101, IDS.users.student), { cookie: instructor });
    expect(res.status).toBe(200);
    expect(res.body.student.name).toBe('Demo Student');
    // The missed Boolean Algebra Quiz is in CPE 201, so it doesn't count in EE 101.
    expect(res.body.requirements).toEqual({ on_time: 1, late: 1, missing: 0 });
  });

  test("another instructor can't see it", async () => {
    expect((await request(url(IDS.courses.ee101, IDS.users.student), { cookie: instructor2 })).status).toBe(404);
  });

  test('only for students who are enrolled in that course', async () => {
    // The demo student isn't in MATH 120, so instructor2 can't look them up through it.
    expect((await request(url(IDS.courses.math120, IDS.users.student), { cookie: instructor2 })).status).toBe(404);
  });

  test("a student can't use this to look at anyone (not even themselves)", async () => {
    expect((await request(url(IDS.courses.ee101, IDS.users.student), { cookie: student })).status).toBe(403);
  });
});
