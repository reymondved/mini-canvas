import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to server/.env (see .env.example).');
}

// A "pool" keeps a few database connections open and shares them,
// so each request doesn't have to connect from scratch.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
