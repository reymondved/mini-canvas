import { mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

if (!process.env.UPLOAD_DIR) {
  throw new Error('UPLOAD_DIR is missing. Add it to server/.env (see .env.example).');
}

// Uploaded files go in this folder inside server/ (ignored by Git).
// The tests use a different folder, so they never touch your real uploads.
const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));
export const UPLOAD_DIR = path.resolve(SERVER_DIR, process.env.UPLOAD_DIR);
mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Allowed file extensions and the file types browsers send for them.
const ALLOWED_TYPES = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // NEVER use the uploaded name on disk: a name like "../../.env" could overwrite files.
    // We save a random ID instead and keep the real name only as text in the database.
    filename: (req, file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  // Runs BEFORE the file is saved, so rejected files never touch the disk.
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = ALLOWED_TYPES[extension]?.includes(file.mimetype);
    if (!allowed) {
      const error = new Error('Only PDF, Word (.docx), text, PNG, JPG or ZIP files are allowed.');
      error.code = 'FILE_TYPE';
      return cb(error);
    }
    cb(null, true);
  },
});

// Middleware: accept one file from the form field "file" and turn upload problems into clear messages.
export function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large (max 5 MB).' });
    }
    if (err?.code === 'FILE_TYPE') {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload one file in the "file" field.' });
    }
    if (err) {
      return next(err);
    }
    next();
  });
}

// Keep the original name for display, but only the last part (no folders) and not too long.
export function cleanFileName(originalName) {
  return path.basename(originalName).replace(/[\u0000-\u001f"]/g, '').slice(0, 200);
}

export async function deleteStoredFile(storedName) {
  await rm(path.join(UPLOAD_DIR, storedName), { force: true });
}
