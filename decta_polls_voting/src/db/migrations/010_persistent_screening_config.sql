-- ============================================================
-- Migration: 010_persistent_screening_config.sql
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE "approvals"
  ADD COLUMN IF NOT EXISTS "persist_until_appeals_end" BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN "approvals"."persist_until_appeals_end" IS 'If true, screening/review tools remain active during the Appeal phase.';
