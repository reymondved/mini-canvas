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

// The seed's announcements, oldest first: 1 site-wide (admin), 2 CS 101, 3 WEB 201, 4 MATH 120 (instructor2).
const SEEDED = { siteWide: 1, cs101: 2, math120: 4 };
const titles = (res) => res.body.announcements.map((a) => a.title);
const courseUrl = `/api/courses/${IDS.courses.cs101}/announcements`;
const post = { title: 'Bring your laptop', body: 'We code together on Monday.' };

describe('who sees which announcements', () => {
  test('not logged in → 401', async () => {
    expect((await request('/api/announcements')).status).toBe(401);
  });

  test("a student sees site-wide + their courses', newest first, but NOT other courses", async () => {
    const res = await request('/api/announcements', { cookie: student });
    expect(titles(res)).toEqual([
      'Lab moved to Thursday',
      'CS 101 midterm: Oct 27, 9:00–11:00',
      'Midterm exam week: Oct 26–30',
    ]);
  });

  test('an instructor sees site-wide + the courses they teach', async () => {
    const res = await request('/api/announcements', { cookie: instructor2 });
    expect(titles(res)).toEqual(['MATH 120 quiz on Friday', 'Midterm exam week: Oct 26–30']);
  });

  test('an admin sees only site-wide announcements (least privilege)', async () => {
    const res = await request('/api/announcements', { cookie: admin });
    expect(titles(res)).toEqual(['Midterm exam week: Oct 26–30']);
  });

  test("a course's list is only for people who may open the course", async () => {
    expect((await request(courseUrl, { cookie: student })).status).toBe(200);
    expect((await request(courseUrl, { cookie: instructor2 })).status).toBe(404);
  });
});

describe('posting to a course', () => {
  test.each([
    ['a student', () => student, 403],
    ['an admin (course posts are for instructors)', () => admin, 403],
    ["an instructor who doesn't teach the course", () => instructor2, 404],
  ])('%s → blocked', async (_label, who, expected) => {
    const res = await request(courseUrl, { method: 'POST', cookie: who(), json: post });
    expect(res.status).toBe(expected);
  });

  test.each([
    ['no title', { title: '' }],
    ['no message', { body: '   ' }],
    ['a message over 5000 characters', { body: 'x'.repeat(5001) }],
  ])('rejects %s', async (_label, change) => {
    const res = await request(courseUrl, { method: 'POST', cookie: instructor, json: { ...post, ...change } });
    expect(res.status).toBe(400);
  });

  test("the course's instructor posts, and enrolled students see it", async () => {
    const res = await request(courseUrl, { method: 'POST', cookie: instructor, json: post });
    expect(res.status).toBe(201);
    expect(res.body.announcement).toMatchObject({ title: 'Bring your laptop', course_code: 'CS 101' });

    const forStudent = await request('/api/announcements', { cookie: student });
    expect(titles(forStudent)[0]).toBe('Bring your laptop');
  });

  test('HTML is kept as plain text, never turned into code (XSS)', async () => {
    const sneaky = { title: 'Hello <b>class</b>', body: '<script>alert("hacked")</script>' };
    const res = await request(courseUrl, { method: 'POST', cookie: instructor, json: sneaky });
    expect(res.status).toBe(201);
    // Sent back exactly as typed, as JSON text: React will show the characters, not run them.
    expect(res.body.announcement.body).toBe('<script>alert("hacked")</script>');
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });
});

describe('site-wide announcements', () => {
  test.each([
    ['a student', () => student],
    ['an instructor', () => instructor],
  ])('%s cannot post site-wide → 403', async (_label, who) => {
    const res = await request('/api/admin/announcements', { method: 'POST', cookie: who(), json: post });
    expect(res.status).toBe(403);
  });

  test('an admin posts one, and everyone sees it', async () => {
    const res = await request('/api/admin/announcements', {
      method: 'POST',
      cookie: admin,
      json: { title: 'Library closed Saturday', body: 'Back on Monday.' },
    });
    expect(res.status).toBe(201);
    expect(res.body.announcement.course_id).toBeNull();

    for (const who of [student, instructor2]) {
      expect(titles(await request('/api/announcements', { cookie: who }))).toContain('Library closed Saturday');
    }
  });
});

describe('editing and deleting', () => {
  const editUrl = `/api/announcements/${SEEDED.cs101}`;
  const changed = { title: 'CS 101 midterm: ROOM CHANGED to 305', body: 'Same time, new room: 305.' };

  test.each([
    ['a student', () => student],
    ['another instructor', () => instructor2],
    ['an admin (not the author)', () => admin],
  ])('%s cannot edit someone else’s announcement → 404', async (_label, who) => {
    const res = await request(editUrl, { method: 'PUT', cookie: who(), json: changed });
    expect(res.status).toBe(404);
  });

  test('the author edits it, and it is marked as edited', async () => {
    const res = await request(editUrl, { method: 'PUT', cookie: instructor, json: changed });
    expect(res.status).toBe(200);
    expect(res.body.announcement.title).toBe('CS 101 midterm: ROOM CHANGED to 305');
    expect(res.body.announcement.edited_at).not.toBeNull();
  });

  test('only the author can delete it', async () => {
    const url = `/api/announcements/${SEEDED.siteWide}`;
    expect((await request(url, { method: 'DELETE', cookie: instructor })).status).toBe(404);
    expect((await request(url, { method: 'DELETE', cookie: admin })).status).toBe(204);

    const res = await request('/api/announcements', { cookie: student });
    expect(titles(res)).not.toContain('Midterm exam week: Oct 26–30');
  });
});
