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

export const MAX_ANNOUNCEMENT_FILES = 3;

// The same safety rules for every upload; only the number of files differs.
function makeUploader(maxFiles) {
  return multer({
    storage: multer.diskStorage({
      destination: UPLOAD_DIR,
      // NEVER use the uploaded name on disk: a name like "../../.env" could overwrite files.
      // We save a random ID instead and keep the real name only as text in the database.
      filename: (req, file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: MAX_FILE_SIZE, files: maxFiles },
    // Runs BEFORE each file is saved, so rejected files never touch the disk.
    // (If one file in a request fails, multer also removes the ones it already saved.)
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
}

// Wraps a multer step so upload problems become clear 400 messages instead of crashes.
function withClearErrors(multerStep, wrongFieldMessage) {
  return (req, res, next) => {
    multerStep(req, res, (err) => {
      if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File is too large (max 5 MB).' });
      }
      if (err?.code === 'FILE_TYPE') {
        return res.status(400).json({ error: err.message });
      }
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: wrongFieldMessage });
      }
      if (err) {
        return next(err);
      }
      next();
    });
  };
}

// Submissions: exactly one file in the form field "file".
export const handleUpload = withClearErrors(makeUploader(1).single('file'), 'Upload one file in the "file" field.');

// Announcements: up to 3 files in the form field "files" (or none). Text fields arrive in req.body.
// Requests that aren't multipart (plain JSON) pass straight through.
export const handleAnnouncementFiles = withClearErrors(
  makeUploader(MAX_ANNOUNCEMENT_FILES).array('files', MAX_ANNOUNCEMENT_FILES),
  `Attach at most ${MAX_ANNOUNCEMENT_FILES} files in the "files" field.`
);

// Keep the original name for display, but only the last part (no folders) and not too long.
export function cleanFileName(originalName) {
  return path.basename(originalName).replace(/[\u0000-\u001f"]/g, '').slice(0, 200);
}

export async function deleteStoredFile(storedName) {
  await rm(path.join(UPLOAD_DIR, storedName), { force: true });
}
