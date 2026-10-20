import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  ADMIN,
  IDS,
  INSTRUCTOR,
  INSTRUCTOR_2,
  STUDENT,
  countUploadedFiles,
  fileForm,
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

const ee101 = `/api/courses/${IDS.courses.ee101}`;

describe('About: course details and syllabus', () => {
  test('people in the course get the description, instructor, student count and syllabus', async () => {
    const res = await request(ee101, { cookie: student });
    expect(res.body.course).toMatchObject({
      code: 'EE 101',
      instructor_name: 'Demo Instructor',
      student_count: 1,
      syllabus_file_name: null,
    });
    expect(res.body.course.syllabus).toContain('Course goals');
    expect(res.body.course).not.toHaveProperty('syllabus_stored_name'); // the disk name stays secret
  });

  test.each([
    ['a student', () => student, 403],
    ["an instructor who doesn't teach it", () => instructor2, 404],
  ])('%s cannot edit the syllabus', async (_label, who, expected) => {
    const res = await request(`${ee101}/syllabus`, { method: 'PUT', cookie: who(), json: { syllabus: 'Hacked' } });
    expect(res.status).toBe(expected);
  });

  test('the instructor edits it; too long is rejected', async () => {
    const ok = await request(`${ee101}/syllabus`, {
      method: 'PUT',
      cookie: instructor,
      json: { syllabus: 'Updated syllabus\nWeek 1: variables' },
    });
    expect(ok.status).toBe(200);
    expect(ok.body.course.syllabus).toBe('Updated syllabus\nWeek 1: variables');

    const tooLong = await request(`${ee101}/syllabus`, {
      method: 'PUT',
      cookie: instructor,
      json: { syllabus: 'x'.repeat(20001) },
    });
    expect(tooLong.status).toBe(400);
  });
});

describe('About: syllabus file', () => {
  const fileUrl = `${ee101}/syllabus/file`;

  test("a student's upload is refused before anything is saved", async () => {
    const before = await countUploadedFiles();
    const res = await request(fileUrl, { method: 'PUT', cookie: student, form: fileForm('s.pdf', '%PDF', 'application/pdf') });
    expect(res.status).toBe(403);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('the instructor uploads it; students can download it', async () => {
    const up = await request(fileUrl, {
      method: 'PUT',
      cookie: instructor,
      form: fileForm('ee101-syllabus.pdf', '%PDF-1.4 syllabus', 'application/pdf'),
    });
    expect(up.status).toBe(200);
    expect(up.body.course.syllabus_file_name).toBe('ee101-syllabus.pdf');

    const down = await request(fileUrl, { cookie: student });
    expect(down.status).toBe(200);
    expect(down.headers.get('content-disposition')).toMatch(/^attachment/);
  });

  test('replacing it keeps one file on disk; wrong types are rejected', async () => {
    const before = await countUploadedFiles();
    await request(fileUrl, { method: 'PUT', cookie: instructor, form: fileForm('v2.pdf', '%PDF v2', 'application/pdf') });
    expect(await countUploadedFiles()).toBe(before);

    const exe = await request(fileUrl, {
      method: 'PUT',
      cookie: instructor,
      form: fileForm('virus.exe', 'MZ', 'application/x-msdownload'),
    });
    expect(exe.status).toBe(400);
    expect(await countUploadedFiles()).toBe(before);
  });

  test("people outside the course can't download it", async () => {
    expect((await request(fileUrl, { cookie: instructor2 })).status).toBe(404);
  });

  test('the instructor removes it, and it is gone from disk', async () => {
    const before = await countUploadedFiles();
    expect((await request(fileUrl, { method: 'DELETE', cookie: instructor })).status).toBe(204);
    expect(await countUploadedFiles()).toBe(before - 1);
    expect((await request(fileUrl, { cookie: student })).status).toBe(404);
  });
});

describe('People', () => {
  test('students see names and roles, but NOT emails', async () => {
    const res = await request(`${ee101}/people`, { cookie: student });
    expect(res.body.people).toEqual([
      { id: IDS.users.instructor, name: 'Demo Instructor', role: 'instructor' },
      { id: IDS.users.student, name: 'Demo Student', role: 'student' },
    ]);
  });

  test("the course's instructor also sees emails", async () => {
    const res = await request(`${ee101}/people`, { cookie: instructor });
    expect(res.body.people.map((p) => p.email)).toEqual(['instructor@demo.test', 'student@demo.test']);
  });

  test.each([
    ['another instructor', () => instructor2],
    ['an admin', () => admin],
  ])("%s can't see the class list", async (_label, who) => {
    expect((await request(`${ee101}/people`, { cookie: who() })).status).toBe(404);
  });
});

describe('Grades: each student sees only their own; the instructor gets a gradebook', () => {
  let secondStudentId;

  // A second student in EE 101 who submits "Thevenin Equivalent Quiz".
  beforeAll(async () => {
    const created = await request('/api/admin/users', {
      method: 'POST',
      cookie: admin,
      json: { name: 'Second Student', email: 'second@demo.test', role: 'student' },
    });
    secondStudentId = created.body.user.id;
    await request(`/api/admin/courses/${IDS.courses.ee101}/students/${secondStudentId}`, { method: 'PUT', cookie: admin });

    const second = await login({ email: 'second@demo.test', password: created.body.temporaryPassword });
    await request('/api/auth/change-password', {
      method: 'POST',
      cookie: second,
      json: { currentPassword: created.body.temporaryPassword, newPassword: 'SecondPass123' },
    });
    await request(`/api/assignments/${IDS.assignments.theveninQuiz}/submission`, {
      method: 'PUT',
      cookie: second,
      form: fileForm('quiz.txt', 'answers', 'text/plain'),
    });
  });

  test("a student's view has only their own scores, nothing about classmates", async () => {
    const res = await request(`${ee101}/grades`, { cookie: student });
    expect(res.body.view).toBe('student');
    const quiz = res.body.assignments.find((a) => a.id === IDS.assignments.theveninQuiz);
    expect(quiz.submitted_at).toBeNull(); // the second student's submission doesn't leak in
    expect(JSON.stringify(res.body)).not.toContain('Second Student');
    expect(res.body.assignments.find((a) => a.id === IDS.assignments.ohmsLaw).score).toBe(9);
  });

  test('the instructor gets every student × every assignment', async () => {
    const res = await request(`${ee101}/grades`, { cookie: instructor });
    expect(res.body.view).toBe('instructor');
    expect(res.body.students.map((s) => s.name)).toEqual(['Demo Student', 'Second Student']);
    expect(res.body.assignments).toHaveLength(3);
    const quizCell = res.body.submissions.find(
      (s) => s.student_id === secondStudentId && s.assignment_id === IDS.assignments.theveninQuiz
    );
    expect(quizCell).toMatchObject({ score: null });
  });

  test('a removed student disappears from the gradebook (their work is kept)', async () => {
    await request(`/api/admin/courses/${IDS.courses.ee101}/students/${secondStudentId}`, {
      method: 'DELETE',
      cookie: admin,
    });
    const res = await request(`${ee101}/grades`, { cookie: instructor });
    expect(res.body.students.map((s) => s.name)).toEqual(['Demo Student']);
    expect(res.body.submissions.some((s) => s.student_id === secondStudentId)).toBe(false);
  });

  test.each([
    ['another instructor', () => instructor2],
    ['an admin', () => admin],
  ])("%s can't see the course's grades", async (_label, who) => {
    expect((await request(`${ee101}/grades`, { cookie: who() })).status).toBe(404);
  });
});
