-- ============================================================
-- Migration: 011_unify_phase_schedules.sql
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Remove redundant date columns from voting_config
ALTER TABLE voting_config 
  DROP COLUMN IF EXISTS voting_start,
  DROP COLUMN IF EXISTS voting_end;

-- Remove redundant date columns from results_config
ALTER TABLE results_config
  DROP COLUMN IF EXISTS publish_at;

-- Ensure election phase has start_date (it was added in 004, but just to be sure for type safety)
-- The columns start_date and deadline already exist in "election phase".
