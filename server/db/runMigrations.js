// Runs the SQL files in server/migrations/ with node-pg-migrate.
// It records which ones have run in the "pgmigrations" table, so each runs only once.
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';

export async function runMigrations({ direction = 'up', count, log = console.log } = {}) {
  await runner({
    databaseUrl: process.env.DATABASE_URL,
    dir: fileURLToPath(new URL('../migrations', import.meta.url)),
    migrationsTable: 'pgmigrations',
    direction, // 'up' = apply new migrations, 'down' = undo the latest
    count,     // how many to run (undefined = all pending for 'up')
    checkOrder: true, // refuse to run if migration files are out of order
    log,
  });
}
