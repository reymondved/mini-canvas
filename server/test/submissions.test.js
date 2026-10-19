import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
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

beforeAll(async () => {
  await startTestServer();
  student = await login(STUDENT);
  instructor = await login(INSTRUCTOR);
  instructor2 = await login(INSTRUCTOR_2);
});
afterAll(stopTestServer);

const submitUrl = (assignmentId) => `/api/assignments/${assignmentId}/submission`;
const textFile = () => fileForm('answer.txt', 'my answer', 'text/plain');

describe('who may upload', () => {
  test('not logged in → 401', async () => {
    const res = await request(submitUrl(IDS.assignments.functionsQuiz), { method: 'PUT', form: textFile() });
    expect(res.status).toBe(401);
  });

  test('an instructor cannot submit (students only) → 403', async () => {
    const res = await request(submitUrl(IDS.assignments.functionsQuiz), {
      method: 'PUT',
      cookie: instructor,
      form: textFile(),
    });
    expect(res.status).toBe(403);
  });

  test('a student cannot submit to a course they are not enrolled in → 404', async () => {
    const res = await request(submitUrl(IDS.assignments.logic), { method: 'PUT', cookie: student, form: textFile() });
    expect(res.status).toBe(404);
  });
});

describe('uploading', () => {
  test('a student can upload a file, and it is saved under a random name', async () => {
    const res = await request(submitUrl(IDS.assignments.functionsQuiz), {
      method: 'PUT',
      cookie: student,
      form: textFile(),
    });
    expect(res.status).toBe(200);
    expect(res.body.submission.file_name).toBe('answer.txt');
    expect(res.body.submission).not.toHaveProperty('stored_name'); // the disk name stays secret
  });

  test('replacing the file keeps ONE file on disk (the old one is deleted)', async () => {
    const before = await countUploadedFiles();
    const res = await request(submitUrl(IDS.assignments.functionsQuiz), {
      method: 'PUT',
      cookie: student,
      form: fileForm('answer-v2.txt', 'better answer', 'text/plain'),
    });
    expect(res.status).toBe(200);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('a sneaky filename with folders is cleaned up', async () => {
    const res = await request(submitUrl(IDS.assignments.homepage), {
      method: 'PUT',
      cookie: student,
      form: fileForm('../../server/.env.txt', 'x', 'text/plain'),
    });
    expect(res.status).toBe(200);
    expect(res.body.submission.file_name).toBe('.env.txt');
  });

  test('a graded submission is locked → 409', async () => {
    const res = await request(submitUrl(IDS.assignments.helloWorld), { method: 'PUT', cookie: student, form: textFile() });
    expect(res.status).toBe(409);
  });
});

describe('rejected uploads never reach the disk', () => {
  // test.each runs the same test once per row.
  test.each([
    ['an .exe file', 'game.exe', 'application/x-msdownload'],
    ['an .html file (could run scripts)', 'page.html', 'text/html'],
    ['an .exe pretending to be .txt', 'fake.txt', 'application/x-msdownload'],
  ])('rejects %s', async (_label, name, type) => {
    const before = await countUploadedFiles();
    const res = await request(submitUrl(IDS.assignments.homepage), {
      method: 'PUT',
      cookie: student,
      form: fileForm(name, 'MZ', type),
    });
    expect(res.status).toBe(400);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('rejects a file over 5 MB', async () => {
    const before = await countUploadedFiles();
    const big = new Uint8Array(6 * 1024 * 1024);
    const res = await request(submitUrl(IDS.assignments.homepage), {
      method: 'PUT',
      cookie: student,
      form: fileForm('big.txt', big, 'text/plain'),
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too large/);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('rejects a request with no file', async () => {
    const res = await request(submitUrl(IDS.assignments.homepage), { method: 'PUT', cookie: student });
    expect(res.status).toBe(400);
  });
});

describe('downloading', () => {
  const fileUrl = `/api/submissions/${IDS.submissions.helloWorldGraded}/file`;

  test('the student can download their own file, always as a download', async () => {
    const res = await request(fileUrl, { cookie: student });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition')).toMatch(/^attachment/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.body).toContain('Hello, World!');
  });

  test("the course's instructor can download it", async () => {
    const res = await request(fileUrl, { cookie: instructor });
    expect(res.status).toBe(200);
  });

  test('another instructor CANNOT download it', async () => {
    const res = await request(fileUrl, { cookie: instructor2 });
    expect(res.status).toBe(404);
  });

  test('not logged in CANNOT download it', async () => {
    const res = await request(fileUrl);
    expect(res.status).toBe(401);
  });
});
