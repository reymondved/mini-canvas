import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  ADMIN,
  IDS,
  INSTRUCTOR,
  STUDENT,
  login,
  request,
  startTestServer,
  stopTestServer,
} from './helpers.js';

let admin;
let student;
let instructor;

beforeAll(async () => {
  await startTestServer();
  admin = await login(ADMIN);
  student = await login(STUDENT);
  instructor = await login(INSTRUCTOR);
});
afterAll(stopTestServer);

describe('only admins can use the admin API', () => {
  test.each([
    ['not logged in', () => undefined, 401],
    ['a student', () => student, 403],
    ['an instructor', () => instructor, 403],
  ])('%s → blocked', async (_label, who, expected) => {
    expect((await request('/api/admin/users', { cookie: who() })).status).toBe(expected);
    expect((await request('/api/admin/courses', { cookie: who() })).status).toBe(expected);
  });

  test('an admin can list users', async () => {
    const res = await request('/api/admin/users', { cookie: admin });
    expect(res.status).toBe(200);
    expect(res.body.users.map((u) => u.email)).toContain(STUDENT.email);
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
  });
});

describe('creating users with a temporary password', () => {
  const newUser = { name: 'New Student', email: 'new.student@demo.test', role: 'student' };
  let temporaryPassword;

  test('creates the user and returns a temporary password once', async () => {
    const res = await request('/api/admin/users', { method: 'POST', cookie: admin, json: newUser });
    expect(res.status).toBe(201);
    expect(res.body.user.must_change_password).toBe(true);
    expect(res.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);
    temporaryPassword = res.body.temporaryPassword;
  });

  test('rejects a duplicate email → 409', async () => {
    const res = await request('/api/admin/users', { method: 'POST', cookie: admin, json: newUser });
    expect(res.status).toBe(409);
  });

  test('rejects an unknown role → 400', async () => {
    const res = await request('/api/admin/users', {
      method: 'POST',
      cookie: admin,
      json: { ...newUser, email: 'other@demo.test', role: 'superuser' },
    });
    expect(res.status).toBe(400);
  });

  test('with a temporary password, the user can ONLY change their password', async () => {
    const cookie = await login({ email: newUser.email, password: temporaryPassword });

    const me = await request('/api/auth/me', { cookie });
    expect(me.status).toBe(200);
    expect(me.body.user.must_change_password).toBe(true);

    const courses = await request('/api/courses/mine', { cookie });
    expect(courses.status).toBe(403);
  });

  test('changing the password unlocks the account, and the temporary one stops working', async () => {
    const cookie = await login({ email: newUser.email, password: temporaryPassword });

    const tooShort = await request('/api/auth/change-password', {
      method: 'POST',
      cookie,
      json: { currentPassword: temporaryPassword, newPassword: 'short' },
    });
    expect(tooShort.status).toBe(400);

    const wrongCurrent = await request('/api/auth/change-password', {
      method: 'POST',
      cookie,
      json: { currentPassword: 'not-it', newPassword: 'MyNewPassword1' },
    });
    expect(wrongCurrent.status).toBe(400);

    const changed = await request('/api/auth/change-password', {
      method: 'POST',
      cookie,
      json: { currentPassword: temporaryPassword, newPassword: 'MyNewPassword1' },
    });
    expect(changed.status).toBe(200);
    expect((await request('/api/courses/mine', { cookie })).status).toBe(200);

    const oldPassword = await request('/api/auth/login', {
      method: 'POST',
      json: { email: newUser.email, password: temporaryPassword },
    });
    expect(oldPassword.status).toBe(401);
  });
});

describe('deactivating users', () => {
  const userUrl = `/api/admin/users/${IDS.users.instructor}`;

  test('a deactivated user is logged out immediately and cannot log in', async () => {
    const cookie = await login(INSTRUCTOR);

    const res = await request(userUrl, { method: 'PATCH', cookie: admin, json: { isActive: false } });
    expect(res.status).toBe(200);

    // Their existing session stops working right away...
    expect((await request('/api/auth/me', { cookie })).status).toBe(401);
    // ...and logging in again gives the usual message (it doesn't reveal the account exists).
    const again = await request('/api/auth/login', { method: 'POST', json: INSTRUCTOR });
    expect(again.status).toBe(401);
    expect(again.body.error).toBe('Invalid email or password.');
  });

  test('a reactivated user can log in again', async () => {
    await request(userUrl, { method: 'PATCH', cookie: admin, json: { isActive: true } });
    const res = await request('/api/auth/login', { method: 'POST', json: INSTRUCTOR });
    expect(res.status).toBe(200);
  });

  test('an admin cannot deactivate themselves', async () => {
    const res = await request(`/api/admin/users/${IDS.users.admin}`, {
      method: 'PATCH',
      cookie: admin,
      json: { isActive: false },
    });
    expect(res.status).toBe(400);
  });
});

describe('managing courses', () => {
  const course = {
    code: 'ART 100',
    title: 'Drawing Basics',
    description: 'Lines, shapes and shading.',
    instructorId: IDS.users.instructor,
  };
  let courseId;

  test('an admin can create a course', async () => {
    const res = await request('/api/admin/courses', { method: 'POST', cookie: admin, json: course });
    expect(res.status).toBe(201);
    expect(res.body.course.instructor_name).toBe('Demo Instructor');
    courseId = res.body.course.id;
  });

  test('rejects a duplicate course code → 409', async () => {
    const res = await request('/api/admin/courses', { method: 'POST', cookie: admin, json: course });
    expect(res.status).toBe(409);
  });

  test('the instructor must really be an instructor', async () => {
    const res = await request('/api/admin/courses', {
      method: 'POST',
      cookie: admin,
      json: { ...course, code: 'ART 200', instructorId: IDS.users.student },
    });
    expect(res.status).toBe(400);
  });

  test('an admin can edit a course', async () => {
    const res = await request(`/api/admin/courses/${courseId}`, {
      method: 'PUT',
      cookie: admin,
      json: { ...course, title: 'Drawing Fundamentals' },
    });
    expect(res.status).toBe(200);
    expect(res.body.course.title).toBe('Drawing Fundamentals');
  });

  test('enrolling a student lets them open the course', async () => {
    const enroll = await request(`/api/admin/courses/${courseId}/students/${IDS.users.student}`, {
      method: 'PUT',
      cookie: admin,
    });
    expect(enroll.status).toBe(204);
    expect((await request(`/api/courses/${courseId}`, { cookie: student })).status).toBe(200);
  });

  test('only students can be enrolled', async () => {
    const res = await request(`/api/admin/courses/${courseId}/students/${IDS.users.instructor}`, {
      method: 'PUT',
      cookie: admin,
    });
    expect(res.status).toBe(400);
  });

  test("an admin does NOT automatically see inside courses (least privilege)", async () => {
    const res = await request(`/api/courses/${courseId}`, { cookie: admin });
    expect(res.status).toBe(404);
  });
});

describe('removing a student from a course', () => {
  const cs101Students = `/api/admin/courses/${IDS.courses.ee101}/students/${IDS.users.student}`;

  test('blocks the course but KEEPS their submissions', async () => {
    const removed = await request(cs101Students, { method: 'DELETE', cookie: admin });
    expect(removed.status).toBe(204);
    expect((await request(`/api/courses/${IDS.courses.ee101}`, { cookie: student })).status).toBe(404);

    // Enroll again: the graded "Ohm's Law Problem Set" submission is still there.
    await request(cs101Students, { method: 'PUT', cookie: admin });
    const assignment = await request(`/api/assignments/${IDS.assignments.ohmsLaw}`, { cookie: student });
    expect(assignment.body.submission.score).toBe(9);
  });
});
