// npm run db:migrate   → apply every migration that hasn't run yet
// npm run db:rollback  → undo the most recent migration (careful: may delete data)
import { runMigrations } from './runMigrations.js';

const direction = process.argv[2] === 'down' ? 'down' : 'up';
await runMigrations({ direction, count: direction === 'down' ? 1 : undefined });
