-- ============================================================
-- Migration: 014_fix_appeals_constraint.sql
-- Run this in your Supabase SQL Editor
-- Fix: Allow multiple appeals per candidate, but only 1 pending at a time
-- ============================================================

-- ── Step 1: Drop the old unconditional unique constraint
-- This allows only 1 appeal ever per candidate/election
ALTER TABLE "appeals" 
DROP CONSTRAINT IF EXISTS "appeals_candidateID_electionID_key";

-- ── Step 2: Add a new partial unique constraint
-- This allows multiple appeals, but enforces uniqueness on PENDING appeals only
ALTER TABLE "appeals" 
ADD CONSTRAINT "appeals_candidateID_electionID_pending_unique" 
UNIQUE ("candidateID", "electionID", "status") 
WHERE "status" = 'pending';

-- ── Step 3: Verify the new constraint
-- Query to check the constraint was created:
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'appeals';
