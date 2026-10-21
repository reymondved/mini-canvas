-- Migration 6: submissions can be a file, a text entry, a website link, or any combination.
-- Each assignment says which of these it accepts.

-- Up Migration

-- Which kinds of submission an assignment accepts, e.g. {file,url}.
-- DEFAULT '{file}' keeps every existing assignment working exactly like before.
-- "<@" means "is contained in": only these three words are allowed, and at least one must be chosen.
ALTER TABLE assignments ADD COLUMN allowed_types TEXT[] NOT NULL DEFAULT '{file}';
ALTER TABLE assignments ADD CONSTRAINT assignments_allowed_types_check
  CHECK (cardinality(allowed_types) >= 1 AND allowed_types <@ ARRAY['file', 'text', 'url']);

-- The file is now optional, so its columns may be empty...
ALTER TABLE submissions ALTER COLUMN file_name   DROP NOT NULL;
ALTER TABLE submissions ALTER COLUMN stored_name DROP NOT NULL;
ALTER TABLE submissions ALTER COLUMN file_type   DROP NOT NULL;
ALTER TABLE submissions ALTER COLUMN file_size   DROP NOT NULL;

-- ...and a submission can also have text and/or a link.
ALTER TABLE submissions ADD COLUMN text_body TEXT;
ALTER TABLE submissions ADD COLUMN url TEXT;

-- Rules the database itself enforces, even if the server code had a bug:
-- 1. A submission must contain SOMETHING: a file, text or a link.
ALTER TABLE submissions ADD CONSTRAINT submissions_has_content
  CHECK (stored_name IS NOT NULL OR text_body IS NOT NULL OR url IS NOT NULL);
-- 2. A file is all-or-nothing: its four columns are either all filled or all empty.
ALTER TABLE submissions ADD CONSTRAINT submissions_file_complete
  CHECK (num_nulls(file_name, stored_name, file_type, file_size) IN (0, 4));

-- Down Migration
-- Undo in reverse order. Submissions without a file can't exist in the old design, so they're removed first.
ALTER TABLE submissions DROP CONSTRAINT submissions_file_complete;
ALTER TABLE submissions DROP CONSTRAINT submissions_has_content;
DELETE FROM submissions WHERE stored_name IS NULL;
ALTER TABLE submissions DROP COLUMN url;
ALTER TABLE submissions DROP COLUMN text_body;
ALTER TABLE submissions ALTER COLUMN file_size   SET NOT NULL;
ALTER TABLE submissions ALTER COLUMN file_type   SET NOT NULL;
ALTER TABLE submissions ALTER COLUMN stored_name SET NOT NULL;
ALTER TABLE submissions ALTER COLUMN file_name   SET NOT NULL;
ALTER TABLE assignments DROP CONSTRAINT assignments_allowed_types_check;
ALTER TABLE assignments DROP COLUMN allowed_types;
