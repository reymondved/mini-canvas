// Fake demo accounts for Phase 2. In Phase 3 these move into the PostgreSQL database.
//
// Passwords are stored as bcrypt hashes, never as plain text.
// The plain demo passwords are listed in the README so you can log in.
const users = [
  {
    id: 1,
    name: 'Demo Student',
    email: 'student@demo.test',
    role: 'student',
    passwordHash: '$2a$12$qnLI8qH/2eEcYjobaOi1Q.MGOS1DTIyPko2VuAlfQUDwhcUA3/yZa',
  },
  {
    id: 2,
    name: 'Demo Instructor',
    email: 'instructor@demo.test',
    role: 'instructor',
    passwordHash: '$2a$12$GaABCDuKZ.F6gzuIrd05buYUSeZdjZjpqJIdQfkBLemjwhmszJxsG',
  },
];

export function findUserByEmail(email) {
  return users.find((user) => user.email === email.trim().toLowerCase());
}

export function findUserById(id) {
  return users.find((user) => user.id === id);
}

// The parts of a user that are safe to send to the browser (no password hash!).
export function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
