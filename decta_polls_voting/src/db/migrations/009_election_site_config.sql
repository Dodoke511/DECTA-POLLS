-- ============================================================
-- Migration: 009_election_site_config.sql
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Election Site Configuration ──────────────────────────────
CREATE TABLE IF NOT EXISTS election_site_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id             UUID NOT NULL REFERENCES election(id) ON DELETE CASCADE,
  tenant_id               UUID NOT NULL REFERENCES "tenants"(id),
  
  -- Site Identity
  public_title            TEXT,
  tagline                 TEXT,
  banner_url              TEXT,
  welcome_message         TEXT,
  show_timeline           BOOLEAN DEFAULT TRUE,
  show_active_phase       BOOLEAN DEFAULT TRUE,

  -- Auth Module Config
  auth_module_heading     TEXT DEFAULT 'Join the Election',
  candidate_reg_label     TEXT DEFAULT 'I am a Candidate',
  voter_login_label       TEXT DEFAULT 'I am a Voter',
  candidate_reg_enabled   BOOLEAN DEFAULT TRUE,

  -- Access Rules
  voter_can_view_candidates BOOLEAN DEFAULT TRUE,
  voter_can_view_stats      BOOLEAN DEFAULT TRUE,
  candidate_can_view_results BOOLEAN DEFAULT TRUE,

  -- Navigation Labels
  nav_filing              TEXT DEFAULT 'File Your Candidacy',
  nav_candidates          TEXT DEFAULT 'Meet the Candidates',
  nav_appeal              TEXT DEFAULT 'Submit an Appeal',
  nav_vote                TEXT DEFAULT 'Cast Your Vote',
  nav_results             TEXT DEFAULT 'Election Results',

  -- Branding
  override_color          TEXT,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(election_id)
);

-- Enable RLS
ALTER TABLE election_site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage their election site config"
  ON election_site_config
  FOR ALL
  USING (
    tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid())
  );

-- ── Update "tenant users" for Public Election Tracking ───────
ALTER TABLE "tenant users"
  ADD COLUMN IF NOT EXISTS registered_via_election UUID REFERENCES election(id),
  ADD COLUMN IF NOT EXISTS registered_via_slug TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'Tenant User' CHECK (user_type IN ('Tenant User', 'Candidate', 'Voter'));
