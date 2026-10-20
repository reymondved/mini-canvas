-- Migration 2: admins, deactivated accounts, and temporary passwords.
-- This CHANGES the users table, which already has data, so every step keeps existing rows valid.

-- Up Migration

-- Allow a third role. A CHECK rule can't be edited, so we drop it and add the new version.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'instructor', 'admin'));

-- New columns need a DEFAULT, so existing users get a sensible value:
-- everyone already in the database is active and doesn't need to change their password.
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration
-- Undo in reverse order. Admin accounts can't exist under the old rule, so they're removed first.
ALTER TABLE users DROP COLUMN must_change_password;
ALTER TABLE users DROP COLUMN is_active;
DELETE FROM users WHERE role = 'admin';
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'instructor'));
