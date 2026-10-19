import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { STUDENT, login, request, startTestServer, stopTestServer } from './helpers.js';

// beforeAll runs once before the tests in this file; afterAll once after them.
beforeAll(startTestServer);
afterAll(stopTestServer);

describe('login', () => {
  test('rejects an empty email and password', async () => {
    const res = await request('/api/auth/login', { method: 'POST', json: { email: '', password: '' } });
    expect(res.status).toBe(400);
  });

  test('rejects a wrong password', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: STUDENT.email, password: 'wrong-password' },
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  test('gives the SAME message for an unknown email (so emails cannot be discovered)', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: 'nobody@demo.test', password: 'whatever' },
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
  });

  test('is not fooled by SQL injection', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: "x' OR 1=1 --", password: 'x' },
    });
    expect(res.status).toBe(401);
  });

  test('logs in with the right password and never sends the password hash back', async () => {
    const res = await request('/api/auth/login', { method: 'POST', json: STUDENT });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 1, name: 'Demo Student', email: STUDENT.email, role: 'student' });
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  test('sets the session cookie as httpOnly (JavaScript in the page cannot read it)', async () => {
    const res = await request('/api/auth/login', { method: 'POST', json: STUDENT });
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i);
  });

  test('ignores capital letters in the email', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      json: { email: 'STUDENT@Demo.Test', password: STUDENT.password },
    });
    expect(res.status).toBe(200);
  });
});

describe('me and logout', () => {
  test('/me says "not logged in" without a cookie', async () => {
    const res = await request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('/me returns the user with a valid cookie', async () => {
    const cookie = await login(STUDENT);
    const res = await request('/api/auth/me', { cookie });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(STUDENT.email);
  });

  test('after logout, the old cookie no longer works', async () => {
    const cookie = await login(STUDENT);
    const logout = await request('/api/auth/logout', { method: 'POST', cookie });
    expect(logout.status).toBe(204);

    const res = await request('/api/auth/me', { cookie });
    expect(res.status).toBe(401);
  });
});
