-- ============================================================
-- Migration: 007_voting_and_results_config.sql
-- ============================================================

-- ── Voting Phase Configuration ──────────────────────────────
CREATE TABLE IF NOT EXISTS voting_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES election(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES "tenants"(id),

  -- Schedule
  voting_start    TIMESTAMPTZ NOT NULL DEFAULT now(),
  voting_end      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),

  -- Ballot settings
  voting_method   TEXT NOT NULL DEFAULT 'standard' CHECK (voting_method IN ('standard', 'ranked')),
  abstain_allowed BOOLEAN DEFAULT FALSE,

  -- Ballot appearance
  ballot_layout   TEXT DEFAULT 'single_page' CHECK (ballot_layout IN ('single_page', 'step_by_step')),
  show_candidate_photos   BOOLEAN DEFAULT TRUE,
  show_position_desc      BOOLEAN DEFAULT TRUE,
  show_candidate_listing_link BOOLEAN DEFAULT TRUE,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(election_id)
);

-- ── Results Phase Configuration ──────────────────────────────
CREATE TABLE IF NOT EXISTS results_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES election(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES "tenants"(id),

  -- Publication
  publish_mode    TEXT DEFAULT 'immediate' CHECK (publish_mode IN ('immediate','manual','scheduled')),
  publish_at      TIMESTAMPTZ,
  results_visibility TEXT DEFAULT 'public' CHECK (results_visibility IN ('public','voters','organization')),

  -- Display (all tiers)
  show_vote_counts    BOOLEAN DEFAULT TRUE,
  show_winner_prominently BOOLEAN DEFAULT TRUE,

  -- Standard+ features
  show_turnout_stats      BOOLEAN DEFAULT FALSE,
  show_live_turnout       BOOLEAN DEFAULT FALSE,
  enable_results_download BOOLEAN DEFAULT FALSE,
  download_format         TEXT DEFAULT 'pdf' CHECK (download_format IN ('pdf','csv','both')),
  download_visibility     TEXT DEFAULT 'public' CHECK (download_visibility IN ('public','admin')),

  -- Enterprise features
  enable_audit_export     BOOLEAN DEFAULT FALSE,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(election_id)
);

-- ── Enable RLS ──────────────────────────────────────────────
ALTER TABLE voting_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE results_config ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────
CREATE POLICY "Tenant can manage their voting config"
  ON voting_config
  FOR ALL
  USING (
    tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid())
  );

CREATE POLICY "Tenant can manage their results config"
  ON results_config
  FOR ALL
  USING (
    tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid())
  );
