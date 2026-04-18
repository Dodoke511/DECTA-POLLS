-- ============================================================
-- Migration: 004_phase_runtime_engine.sql
-- Run this in your Supabase SQL Editor
-- This adds the runtime orchestration fields to `election phase`
-- ============================================================

ALTER TABLE "election phase"
  ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now();

-- Example index for the monitor cron jobs to quickly find pending deadlines
CREATE INDEX IF NOT EXISTS "idx_election_phase_runtime" 
  ON "election phase" ("transition_mode", "deadline", "completed_at") 
  WHERE "completed_at" IS NULL;
