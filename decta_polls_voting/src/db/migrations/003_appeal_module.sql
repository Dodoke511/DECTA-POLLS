-- ============================================================
-- Migration: 003_appeal_module.sql
-- Run this in your Supabase SQL Editor
-- Table naming follows existing camelCase + space conventions
-- ============================================================

-- ── 1. Create "appeal config" table ─────────────────────────
-- Configuration defined per phase by the tenant admin.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "appeal config" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phaseID" UUID REFERENCES "election phase"(id) ON DELETE CASCADE UNIQUE NOT NULL,
  "electionID" UUID REFERENCES "election"(id) ON DELETE CASCADE NOT NULL,
  "tenantID" UUID NOT NULL,
  
  -- Eligibility
  "whoCanAppeal" VARCHAR(50) DEFAULT 'rejected_only',
  "maxAppeals" INT DEFAULT 1,
  
  -- Outcomes
  "onApproveAction" VARCHAR(50) DEFAULT 'change_status',
  "onApproveStatus" VARCHAR(50) DEFAULT 'approved',
  "onRejectAction" VARCHAR(50) DEFAULT 'keep_rejected',
  "onRejectStatus" VARCHAR(50) DEFAULT 'rejected',
  
  -- Visibility
  "visibility" JSONB DEFAULT '["candidate", "reviewers"]',
  "showRejectionReason" BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Single/Multi Approver logic reuses the existing "approvals" table
-- Note: Form configuration reuses "forms" and "form_fields" tables via phaseName (toolName)

ALTER TABLE "appeal config" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage their appeal config"
  ON "appeal config"
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );

-- ── 2. Create "appeals" table ───────────────────────────────
-- The core runtime table generated when candidates appeal.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "appeals" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "candidateID" UUID REFERENCES "candidates"(id) ON DELETE CASCADE NOT NULL,
  "electionID" UUID REFERENCES "election"(id) ON DELETE CASCADE NOT NULL,
  "tenantID" UUID NOT NULL,
  
  "status" VARCHAR(50) DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected'
  "formResponseID" UUID, -- Can be linked after the form engine creates the tuple (if you maintain an ID for form_responses)
  
  "submittedAt" TIMESTAMPTZ DEFAULT now(),
  
  -- Allows multiple appeals per candidate, but enforces uniqueness on PENDING appeals only
  -- This way: one pending, but multiple resolved appeals allowed
  UNIQUE ("candidateID", "electionID", "status") WHERE "status" = 'pending'
);

ALTER TABLE "appeals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage their appeals"
  ON "appeals"
  FOR ALL
  USING (
    "tenantID" = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
  );

-- ── 3. Create "appeal decisions" table ──────────────────────
-- The audit/decision log for appeal resolutions.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "appeal decisions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appealID" UUID REFERENCES "appeals"(id) ON DELETE CASCADE NOT NULL,
  "decidedBy" UUID NOT NULL, -- The user resolving the appeal
  "decision" VARCHAR(20) NOT NULL, -- 'approve', 'reject'
  "reason" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "appeal decisions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage appeal decisions"
  ON "appeal decisions"
  FOR ALL
  USING (
    "appealID" IN (
      SELECT id FROM "appeals" WHERE "tenantID" = (
        SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
      )
    )
  );
