-- ============================================================
-- Migration: 001_screening_rpc.sql
-- Run this in your Supabase SQL Editor
-- Table naming follows your existing camelCase + space conventions
-- ============================================================

-- ── Create "audit logs" table ────────────────────────────────
-- Central activity trail for all significant system actions.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit logs" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantID"    UUID,
  "electionID"  UUID,
  "actorID"     UUID,         -- who performed the action (tenant_users.id)
  "actionType"  TEXT NOT NULL, -- e.g. 'screening_decision', 'phase_advanced'
  "targetID"    UUID,         -- which record was affected (e.g. candidateID)
  metadata      JSONB,        -- flexible extra context (decision, reason, etc.)
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE "audit logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view their audit logs"
  ON "audit logs"
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );

-- ── finalize_screening_decision ──────────────────────────────
-- Atomically:
--   1. Inserts a record into "screening evals"
--   2. Updates the candidate's status in "candidates"
--   3. Inserts an audit entry into "audit logs"
-- Uses SECURITY DEFINER so it bypasses RLS for the UPDATE.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION finalize_screening_decision(
  p_candidate_id  UUID,
  p_election_id   UUID,
  p_tenant_id     UUID,
  p_decided_by    UUID,
  p_decision      TEXT,   -- 'approved' | 'rejected'
  p_reason        TEXT    -- required when p_decision = 'rejected'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate decision value
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid decision value: %. Must be approved or rejected.', p_decision;
  END IF;

  -- Enforce reason for rejections
  IF p_decision = 'rejected' AND (p_reason IS NULL OR trim(p_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required when rejecting a candidate.';
  END IF;

  -- 1. Insert into "screening evals"
  INSERT INTO "screening evals" (
    "candidateID",
    "electionID",
    "tenantID",
    "decidedBy",
    "decision",
    "reason"
  ) VALUES (
    p_candidate_id,
    p_election_id,
    p_tenant_id,
    p_decided_by,
    p_decision,
    p_reason
  );

  -- 2. Update candidate status
  -- Adjust table/column names below if your candidates table uses different naming
  UPDATE candidates
  SET status = p_decision
  WHERE id = p_candidate_id;

  -- 3. Audit log entry
  -- Adjust "audit logs" table/column names to match your actual schema
  INSERT INTO "audit logs" (
    "tenantID",
    "electionID",
    "actorID",
    "actionType",
    "targetID",
    "metadata"
  ) VALUES (
    p_tenant_id,
    p_election_id,
    p_decided_by,
    'screening_decision',
    p_candidate_id,
    jsonb_build_object(
      'decision',     p_decision,
      'reason',       p_reason,
      'candidate_id', p_candidate_id
    )
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION finalize_screening_decision(UUID, UUID, UUID, UUID, TEXT, TEXT)
  TO authenticated;


-- ── RLS policies for screening tables ────────────────────────
-- "tenant users" uses tenantID column (camelCase, confirmed)

-- "phase rule"
ALTER TABLE "phase rule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage their phase rules"
  ON "phase rule"
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );

-- "candidate rule flags"
ALTER TABLE "candidate rule flags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view their candidate rule flags"
  ON "candidate rule flags"
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );

-- "approvals"
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage their approvals"
  ON approvals
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );

-- "screening evals"
ALTER TABLE "screening evals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage their screening evals"
  ON "screening evals"
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );
