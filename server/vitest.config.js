import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests read their settings from .env.test (test database, test uploads folder), never .env.
    env: parseEnv(readFileSync(new URL('./.env.test', import.meta.url), 'utf8')),
    // All test files share one test database, so run them one file at a time.
    fileParallelism: false,
  },
});
