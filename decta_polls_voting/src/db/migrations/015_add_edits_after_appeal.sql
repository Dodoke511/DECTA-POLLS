-- Migration: 015_add_edits_after_appeal.sql
-- Adds a column to track how many times a candidate can edit their application
-- after an approved appeal. Incremented when an appeal is approved.

ALTER TABLE "candidate"
ADD COLUMN IF NOT EXISTS "edits_remaining_after_appeal" INT DEFAULT 0;

-- Optional: ensure non-negative
ALTER TABLE "candidate"
ALTER COLUMN "edits_remaining_after_appeal" SET DEFAULT 0;
