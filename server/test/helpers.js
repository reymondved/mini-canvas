// Shared tools for the API tests: start the server, reset the data, log in, send requests.
import { once } from 'node:events';
import { readdir } from 'node:fs/promises';
import { pool } from '../src/db.js';
import { app } from '../src/app.js';
import { UPLOAD_DIR } from '../src/uploads.js';
import { seedDemoData } from '../db/demoData.js';

// Safety check: tests wipe the database, so refuse to run against anything but a *_test database.
if (!process.env.DATABASE_URL.endsWith('_test')) {
  throw new Error('Tests must use a database whose name ends in "_test". Check server/.env.test.');
}

// The fake demo accounts (same as db/demoData.js).
export const STUDENT = { email: 'student@demo.test', password: 'Student123!' };
export const INSTRUCTOR = { email: 'instructor@demo.test', password: 'Instructor123!' };
export const INSTRUCTOR_2 = { email: 'instructor2@demo.test', password: 'Instructor123!' };

// Ids of the demo data. They're always the same because the seed restarts the counters.
export const IDS = {
  courses: { cs101: 1, web201: 2, db210: 3, math120: 4 },
  assignments: { helloWorld: 1, loops: 2, functionsQuiz: 3, homepage: 4, logic: 8 },
  submissions: { helloWorldGraded: 1, loopsUngraded: 2 },
};

let server;
let baseUrl;

// Reset the test database to the demo data and start the server on a random free port (0 = "any").
export async function startTestServer() {
  await seedDemoData({ log: () => {} });
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://localhost:${server.address().port}`;
}

export async function stopTestServer() {
  server.close();
  await pool.end();
}

// Send a request and return { status, body, headers }.
// cookie: who is asking (from login). json: a JSON body. form: a FormData body (for file uploads).
export async function request(path, { method = 'GET', cookie, json, form } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  if (form) body = form;

  const response = await fetch(baseUrl + path, { method, headers, body });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  return {
    status: response.status,
    body: isJson ? await response.json() : await response.text(),
    headers: response.headers,
  };
}

// Log in and return the session cookie, to pass as { cookie } in later requests.
export async function login({ email, password }) {
  const response = await request('/api/auth/login', { method: 'POST', json: { email, password } });
  if (response.status !== 200) throw new Error(`Login failed for ${email}`);
  return response.headers.get('set-cookie').split(';')[0];
}

// A form containing one file, like the upload form in the browser sends.
export function fileForm(name, content, type) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  return form;
}

export async function countUploadedFiles() {
  return (await readdir(UPLOAD_DIR)).length;
}
