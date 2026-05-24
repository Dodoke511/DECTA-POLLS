-- ============================================================
-- Migration: 012_extend_branding_config.sql
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE election_site_config
  ADD COLUMN IF NOT EXISTS secondary_override_color TEXT,
  ADD COLUMN IF NOT EXISTS third_override_color TEXT,
  ADD COLUMN IF NOT EXISTS logo_url_override TEXT;

-- We already have override_color, let's rename it conceptually if needed 
-- but we'll keep it as the primary/main override to avoid breaking changes.
