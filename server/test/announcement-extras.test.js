import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  ADMIN,
  IDS,
  INSTRUCTOR,
  INSTRUCTOR_2,
  STUDENT,
  countUploadedFiles,
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

// Seeded: 1 site-wide, 2 CS 101 midterm (1 file + 2 replies), 3 WEB 201, 4 MATH 120 (student not enrolled).
const A = { siteWide: 1, cs101: 2, math120: 4 };
const SEEDED_FILE = 1;
const SEEDED_REPLY = { byStudent: 1, byInstructor: 2 };

async function myAnnouncement(cookie, id) {
  const res = await request('/api/announcements', { cookie });
  return res.body.announcements.find((a) => a.id === id);
}

// A multipart form like the browser sends: text fields + any number of files in "files".
function announcementForm(title, body, files = []) {
  const form = new FormData();
  form.append('title', title);
  form.append('body', body);
  for (const [name, content, type] of files) {
    form.append('files', new Blob([content], { type }), name);
  }
  return form;
}

describe('opening one announcement', () => {
  test('people who may see it get the full announcement', async () => {
    const res = await request(`/api/announcements/${A.cs101}`, { cookie: student });
    expect(res.status).toBe(200);
    expect(res.body.announcement).toMatchObject({ id: A.cs101, course_code: 'CS 101', is_read: false });
  });

  test("everyone else gets 404, even if they guess the number", async () => {
    expect((await request(`/api/announcements/${A.math120}`, { cookie: student })).status).toBe(404);
    expect((await request(`/api/announcements/${A.cs101}`, { cookie: admin })).status).toBe(404);
    expect((await request('/api/announcements/abc', { cookie: student })).status).toBe(404);
  });
});

describe('read and unread (each person has their own)', () => {
  test('new announcements start unread, but your own posts are already read', async () => {
    expect((await myAnnouncement(student, A.cs101)).is_read).toBe(false);
    expect((await myAnnouncement(instructor, A.cs101)).is_read).toBe(true);
  });

  test('marking as read only changes it for ME', async () => {
    const res = await request(`/api/announcements/${A.siteWide}/read`, { method: 'PUT', cookie: student });
    expect(res.status).toBe(204);
    expect((await myAnnouncement(student, A.siteWide)).is_read).toBe(true);
    expect((await myAnnouncement(instructor2, A.siteWide)).is_read).toBe(false);
  });

  test('marking as read twice is harmless, and it can be marked unread again', async () => {
    await request(`/api/announcements/${A.siteWide}/read`, { method: 'PUT', cookie: student });
    const res = await request(`/api/announcements/${A.siteWide}/read`, { method: 'DELETE', cookie: student });
    expect(res.status).toBe(204);
    expect((await myAnnouncement(student, A.siteWide)).is_read).toBe(false);
  });

  test("you can't mark an announcement you can't see", async () => {
    const res = await request(`/api/announcements/${A.math120}/read`, { method: 'PUT', cookie: student });
    expect(res.status).toBe(404);
    expect((await request(`/api/announcements/${A.cs101}/read`, { method: 'PUT' })).status).toBe(401);
  });
});

describe('replies', () => {
  const url = `/api/announcements/${A.cs101}/replies`;

  test('everyone in the course sees the replies, oldest first, with who wrote them', async () => {
    const res = await request(url, { cookie: student });
    expect(res.status).toBe(200);
    expect(res.body.replies.map((r) => [r.author_role, r.body])).toEqual([
      ['student', 'Is it open notes?'],
      ['instructor', 'No, closed notes. You may bring one index card.'],
    ]);
    expect((await myAnnouncement(student, A.cs101)).reply_count).toBe(2);
  });

  test("people outside the course can't read or post replies", async () => {
    expect((await request(url, { cookie: instructor2 })).status).toBe(404);
    expect((await request(url, { method: 'POST', cookie: instructor2, json: { body: 'Hi' } })).status).toBe(404);
  });

  test('a student replies, and the reply is kept as plain text', async () => {
    const res = await request(url, {
      method: 'POST',
      cookie: student,
      json: { body: 'Can we use a calculator? <script>alert(1)</script>' },
    });
    expect(res.status).toBe(201);
    expect(res.body.reply).toMatchObject({
      body: 'Can we use a calculator? <script>alert(1)</script>',
      author_role: 'student',
      can_delete: true,
    });
  });

  test.each([
    ['an empty reply', { body: '   ' }],
    ['a reply over 2000 characters', { body: 'x'.repeat(2001) }],
  ])('rejects %s', async (_label, json) => {
    expect((await request(url, { method: 'POST', cookie: student, json })).status).toBe(400);
  });

  test('site-wide announcements take no replies', async () => {
    const res = await request(`/api/announcements/${A.siteWide}/replies`, {
      method: 'POST',
      cookie: student,
      json: { body: 'Thanks!' },
    });
    expect(res.status).toBe(400);
  });

  test("a student can't delete the instructor's reply", async () => {
    const res = await request(`/api/announcements/replies/${SEEDED_REPLY.byInstructor}`, {
      method: 'DELETE',
      cookie: student,
    });
    expect(res.status).toBe(404);
  });

  test("the course's instructor can delete a student's reply (moderation)", async () => {
    const res = await request(`/api/announcements/replies/${SEEDED_REPLY.byStudent}`, {
      method: 'DELETE',
      cookie: instructor,
    });
    expect(res.status).toBe(204);
    const replies = await request(url, { cookie: student });
    expect(replies.body.replies.map((r) => r.body)).not.toContain('Is it open notes?');
  });
});

describe('attached files', () => {
  const courseUrl = `/api/courses/${IDS.courses.cs101}/announcements`;

  test("files are listed with the announcement, without their secret disk name", async () => {
    const a = await myAnnouncement(student, A.cs101);
    expect(a.files).toEqual([{ id: SEEDED_FILE, file_name: 'midterm-coverage.txt', file_size: expect.any(Number) }]);
  });

  test('people in the course can download it, always as a download', async () => {
    const res = await request(`/api/announcements/files/${SEEDED_FILE}`, { cookie: student });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/^attachment/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.body).toContain('Loops');
  });

  test("people outside the course can't download it", async () => {
    expect((await request(`/api/announcements/files/${SEEDED_FILE}`, { cookie: instructor2 })).status).toBe(404);
    expect((await request(`/api/announcements/files/${SEEDED_FILE}`)).status).toBe(401);
  });

  test('an instructor posts with 2 files', async () => {
    const before = await countUploadedFiles();
    const res = await request(courseUrl, {
      method: 'POST',
      cookie: instructor,
      form: announcementForm('Reviewer', 'See the attached files.', [
        ['reviewer.pdf', '%PDF-1.4 fake', 'application/pdf'],
        ['answers.txt', 'A, B, C', 'text/plain'],
      ]),
    });
    expect(res.status).toBe(201);
    expect(res.body.announcement.files.map((f) => f.file_name)).toEqual(['reviewer.pdf', 'answers.txt']);
    expect(await countUploadedFiles()).toBe(before + 2);
  });

  test.each([
    ['4 files (max is 3)', 'OK title', [1, 2, 3, 4].map((n) => [`f${n}.txt`, 'x', 'text/plain'])],
    ['an .exe file', 'OK title', [['game.exe', 'MZ', 'application/x-msdownload']]],
    ['a missing title (files are cleaned up)', '', [['a.txt', 'x', 'text/plain']]],
  ])('rejects %s, and nothing stays on disk', async (_label, title, files) => {
    const before = await countUploadedFiles();
    const res = await request(courseUrl, {
      method: 'POST',
      cookie: instructor,
      form: announcementForm(title, 'Message', files),
    });
    expect(res.status).toBe(400);
    expect(await countUploadedFiles()).toBe(before);
  });

  test("a student's upload is refused BEFORE any file is saved", async () => {
    const before = await countUploadedFiles();
    const res = await request(courseUrl, {
      method: 'POST',
      cookie: student,
      form: announcementForm('Hi', 'Hi', [['a.txt', 'x', 'text/plain']]),
    });
    expect(res.status).toBe(403);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('an admin can attach files to a site-wide announcement', async () => {
    const res = await request('/api/admin/announcements', {
      method: 'POST',
      cookie: admin,
      form: announcementForm('Exam schedule', 'Attached.', [['schedule.txt', 'Mon: CS 101', 'text/plain']]),
    });
    expect(res.status).toBe(201);
    expect(res.body.announcement.files).toHaveLength(1);
  });

  test('deleting an announcement also deletes its files from disk', async () => {
    const before = await countUploadedFiles();
    const res = await request(`/api/announcements/${A.cs101}`, { method: 'DELETE', cookie: instructor });
    expect(res.status).toBe(204);
    expect(await countUploadedFiles()).toBe(before - 1);
  });
});
