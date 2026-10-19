// Creates the tables (if missing) and adds the fake demo accounts.
// Run with:  npm run db:seed   (safe to run again; it updates existing demo users)
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

// Fake demo accounts only. These passwords are hashed before they are saved.
const demoUsers = [
  { name: 'Demo Student', email: 'student@demo.test', password: 'Student123!', role: 'student' },
  { name: 'Demo Instructor', email: 'instructor@demo.test', password: 'Instructor123!', role: 'instructor' },
];

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
console.log('Tables ready.');

for (const user of demoUsers) {
  const passwordHash = await bcrypt.hash(user.password, 12);
  // $1, $2... are placeholders. pg sends the values separately from the SQL,
  // so user data can never change the query itself (this prevents SQL injection).
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [user.name, user.email, passwordHash, user.role]
  );
  console.log(`Seeded ${user.role}: ${user.email}`);
}

await pool.end();
