-- Migration 5: a syllabus for each course (text, plus one optional file such as the official PDF).

-- Up Migration

-- DEFAULT '' so every existing course gets an empty syllabus instead of breaking the NOT NULL rule.
ALTER TABLE courses ADD COLUMN syllabus TEXT NOT NULL DEFAULT '';

-- The optional file, described like submissions: the file is on disk, these columns describe it.
-- All four are empty (NULL) when there's no file.
ALTER TABLE courses ADD COLUMN syllabus_file_name   TEXT;        -- original name, only shown to people
ALTER TABLE courses ADD COLUMN syllabus_stored_name TEXT UNIQUE; -- random name on disk
ALTER TABLE courses ADD COLUMN syllabus_file_type   TEXT;
ALTER TABLE courses ADD COLUMN syllabus_file_size   INTEGER;

-- Down Migration
ALTER TABLE courses DROP COLUMN syllabus_file_size;
ALTER TABLE courses DROP COLUMN syllabus_file_type;
ALTER TABLE courses DROP COLUMN syllabus_stored_name;
ALTER TABLE courses DROP COLUMN syllabus_file_name;
ALTER TABLE courses DROP COLUMN syllabus;
