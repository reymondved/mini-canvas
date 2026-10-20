import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { ADMIN, INSTRUCTOR, INSTRUCTOR_2, STUDENT, login, request, startTestServer, stopTestServer } from './helpers.js';

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

const search = (q, cookie) => request(`/api/search?q=${encodeURIComponent(q)}`, { cookie });
const titles = (list) => list.map((x) => x.title);

describe('basics', () => {
  test('not logged in → 401', async () => {
    expect((await search('ohm')).status).toBe(401);
  });

  test.each([
    ['1 character', 'a'],
    ['only spaces', '    '],
    ['over 100 characters', 'x'.repeat(101)],
  ])('rejects a search of %s', async (_label, q) => {
    expect((await search(q, student)).status).toBe(400);
  });

  test('finds courses, assignments and announcements, ignoring capitals', async () => {
    const res = await search('OHM', student);
    expect(res.status).toBe(200);
    expect(res.body.courses.map((c) => c.code)).toEqual(['EE 101']); // its description mentions Ohm's law
    expect(titles(res.body.assignments)).toEqual(["Ohm's Law Problem Set"]);
    expect(titles(res.body.announcements)).toEqual(['EE 101 midterm: Oct 27, 9:00–11:00']);
  });

  test('also matches words that are only in the description or message', async () => {
    const res = await search('breadboard', student);
    expect(titles(res.body.announcements)).toEqual(['Lab moved to Thursday']);
  });
});

describe('search only shows what you may open', () => {
  test("a student never finds a course they're not enrolled in, or anything inside it", async () => {
    const course = await search('Differential', student);
    expect(course.body.courses).toEqual([]);
    const assignment = await search('ODE', student);
    expect(assignment.body.assignments).toEqual([]);
    const announcement = await search('separable', student);
    expect(announcement.body.announcements).toEqual([]);
  });

  test('the instructor of that course does find them', async () => {
    const res = await search('separable', instructor2);
    expect(titles(res.body.announcements)).toEqual(['MATH 120 quiz on Friday']);
  });

  test("an instructor doesn't find another instructor's courses", async () => {
    expect((await search('Circuit Analysis', instructor2)).body.courses).toEqual([]);
    expect((await search('Circuit Analysis', instructor)).body.courses.map((c) => c.code)).toEqual(['EE 101']);
  });

  test('site-wide announcements are found by everyone', async () => {
    expect(titles((await search('exam week', instructor2)).body.announcements)).toContain('Midterm exam week: Oct 26–30');
  });
});

describe('special characters are searched as plain text', () => {
  test.each(['%%', '__', '%_'])('"%s" does NOT match everything', async (q) => {
    const res = await search(q, student);
    expect(res.status).toBe(200);
    expect(res.body.courses).toEqual([]);
    expect(res.body.assignments).toEqual([]);
    expect(res.body.announcements).toEqual([]);
  });

  test('a quote in the search is just a character (no SQL injection)', async () => {
    const res = await search("Ohm's", student);
    expect(titles(res.body.assignments)).toEqual(["Ohm's Law Problem Set"]);
  });
});

describe('admins search what they manage', () => {
  test('users and all courses, but no course content', async () => {
    const people = await search('demo.test', admin);
    expect(people.body.users.length).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(people.body)).not.toContain('password');

    const courses = await search('Differential', admin);
    expect(courses.body.courses.map((c) => c.code)).toEqual(['MATH 120']);

    const content = await search('ohm', admin);
    expect(content.body.assignments).toEqual([]);
    expect(content.body.announcements).toEqual([]);
  });
});
