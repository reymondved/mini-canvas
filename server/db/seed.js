// Run with:  npm run db:seed
// Resets the database (and uploaded files) to the demo data in demoData.js.
import { pool } from '../src/db.js';
import { seedDemoData } from './demoData.js';

await seedDemoData();
await pool.end();
