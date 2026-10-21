// Submission types: each assignment accepts a file, a text entry, a link, or a mix of them.
// Demo assignments used here:
//   Karnaugh Map Exercise → file + text
//   Convolution Lab       → file + link
//   Boolean Algebra Quiz  → text only
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  IDS,
  INSTRUCTOR,
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

beforeAll(async () => {
  await startTestServer();
  student = await login(STUDENT);
  instructor = await login(INSTRUCTOR);
});
afterAll(stopTestServer);

const submitUrl = (assignmentId) => `/api/assignments/${assignmentId}/submission`;

// A submission form: any of file, text, url and removeFile.
function submissionForm({ file, text, url, removeFile } = {}) {
  const form = file ? fileForm(file, 'my answer', 'text/plain') : new FormData();
  if (text !== undefined) form.append('text', text);
  if (url !== undefined) form.append('url', url);
  if (removeFile) form.append('removeFile', 'true');
  return form;
}

const submit = (assignmentId, fields) =>
  request(submitUrl(assignmentId), { method: 'PUT', cookie: student, form: submissionForm(fields) });

describe('links', () => {
  test.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://example.com/file', 'not a link'])(
    'refuses %s → 400',
    async (url) => {
      const res = await submit(IDS.assignments.convolution, { url });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/http:\/\/ or https:\/\//);
    }
  );

  test('a refused link also throws away the file sent with it', async () => {
    const before = await countUploadedFiles();
    const res = await submit(IDS.assignments.convolution, { file: 'lab.txt', url: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('a file AND a link in one submission', async () => {
    const res = await submit(IDS.assignments.convolution, { file: 'lab.txt', url: 'https://example.com/my-code' });
    expect(res.status).toBe(200);
    expect(res.body.submission).toMatchObject({ file_name: 'lab.txt', url: 'https://example.com/my-code', text_body: null });
  });
});

describe('keeping, replacing and removing the file', () => {
  test('resubmitting without a file keeps the file already there', async () => {
    await submit(IDS.assignments.karnaugh, { file: 'kmaps.txt' });
    const before = await countUploadedFiles();

    const res = await submit(IDS.assignments.karnaugh, { text: 'I also added notes.' });
    expect(res.status).toBe(200);
    expect(res.body.submission).toMatchObject({ file_name: 'kmaps.txt', text_body: 'I also added notes.' });
    expect(await countUploadedFiles()).toBe(before);
  });

  test('removeFile drops the file (and deletes it from disk) but keeps the text', async () => {
    const before = await countUploadedFiles();
    const res = await submit(IDS.assignments.karnaugh, { text: 'Text only now.', removeFile: true });
    expect(res.status).toBe(200);
    expect(res.body.submission).toMatchObject({ file_name: null, file_size: null, text_body: 'Text only now.' });
    expect(await countUploadedFiles()).toBe(before - 1);
  });

  test('removing everything is refused → 400', async () => {
    const res = await submit(IDS.assignments.karnaugh, { text: '   ', removeFile: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Add a file, a text entry or a link/);
  });

  test('an empty first submission is refused → 400', async () => {
    const res = await submit(IDS.assignments.logicGates, {});
    expect(res.status).toBe(400);
  });
});

describe('types the assignment does not accept', () => {
  test('a file for a text-only assignment → 400, nothing saved to disk', async () => {
    const before = await countUploadedFiles();
    const res = await submit(IDS.assignments.booleanQuiz, { file: 'quiz.txt', text: 'answers' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/doesn’t accept file uploads/);
    expect(await countUploadedFiles()).toBe(before);
  });

  test('a link for a text-only assignment → 400', async () => {
    const res = await submit(IDS.assignments.booleanQuiz, { url: 'https://example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/doesn’t accept website links/);
  });

  test('text for a file + link assignment → 400', async () => {
    const res = await submit(IDS.assignments.convolution, { text: 'hello' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/doesn’t accept text entries/);
  });
});

describe('text entries', () => {
  test('HTML in a text entry is stored as plain text, exactly as typed', async () => {
    const text = '<script>alert("hi")</script>\nLine two';
    const res = await submit(IDS.assignments.booleanQuiz, { text });
    expect(res.status).toBe(200);
    expect(res.body.submission.text_body).toBe(text);

    // The instructor sees the same text when grading.
    const view = await request(`/api/assignments/${IDS.assignments.booleanQuiz}`, { cookie: instructor });
    const mine = view.body.submissions.find((s) => s.student_id === IDS.users.student);
    expect(mine.text_body).toBe(text);
  });

  test('text over 20000 characters → 400', async () => {
    const res = await submit(IDS.assignments.booleanQuiz, { text: 'a'.repeat(20001) });
    expect(res.status).toBe(400);
  });

  test('downloading a submission that has no file → 404', async () => {
    const view = await request(`/api/assignments/${IDS.assignments.booleanQuiz}`, { cookie: student });
    const res = await request(`/api/submissions/${view.body.submission.id}/file`, { cookie: student });
    expect(res.status).toBe(404);
  });
});

describe('instructors choose the accepted types', () => {
  const newAssignment = (allowedTypes) => ({
    title: 'Bode Plot Homework',
    description: 'Sketch the Bode plots.',
    dueAt: '2026-12-01T15:59:00.000Z',
    points: 20,
    allowedTypes,
  });
  const create = (body) =>
    request(`/api/courses/${IDS.courses.ee101}/assignments`, { method: 'POST', cookie: instructor, json: body });

  test('saves the chosen types in a fixed order, without duplicates', async () => {
    const res = await create(newAssignment(['url', 'text', 'url']));
    expect(res.status).toBe(201);
    expect(res.body.assignment.allowed_types).toEqual(['text', 'url']);
  });

  test('leaving allowedTypes out means "file"', async () => {
    const { allowedTypes, ...body } = newAssignment();
    const res = await create(body);
    expect(res.status).toBe(201);
    expect(res.body.assignment.allowed_types).toEqual(['file']);
  });

  test.each([[[]], [['video']], ['file']])('refuses allowedTypes = %j → 400', async (allowedTypes) => {
    const res = await create(newAssignment(allowedTypes));
    expect(res.status).toBe(400);
  });
});
