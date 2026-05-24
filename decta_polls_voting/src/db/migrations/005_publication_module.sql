-- ============================================================
-- Migration: 005_publication_module.sql
-- Candidate Publication Config Data Modeling
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Main config record per election
CREATE TABLE IF NOT EXISTS candidate_listing_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id          UUID NOT NULL REFERENCES "election"(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES "tenants"(id) ON DELETE CASCADE,
  layout_style         TEXT NOT NULL DEFAULT 'grid' CHECK (layout_style IN ('grid','list','detailed')),
  show_photo           BOOLEAN DEFAULT TRUE,
  header_field_map     JSONB DEFAULT '{}',
  persist_after_phase  BOOLEAN DEFAULT TRUE,
  enable_profile_pages BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(election_id)
);

-- Sections in the field arranger
CREATE TABLE IF NOT EXISTS listing_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES "election"(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES "tenants"(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  order_index   INTEGER NOT NULL,
  is_visible    BOOLEAN DEFAULT TRUE,
  display_style TEXT DEFAULT 'rows' CHECK (display_style IN ('rows','prose','tags')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(election_id, order_index) DEFERRABLE INITIALLY DEFERRED
);

-- Form fields assigned to sections
CREATE TABLE IF NOT EXISTS listing_section_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    UUID NOT NULL REFERENCES listing_sections(id) ON DELETE CASCADE,
  election_id   UUID NOT NULL REFERENCES "election"(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES "tenants"(id) ON DELETE CASCADE,
  field_id      UUID NOT NULL REFERENCES "form field"(id) ON DELETE CASCADE,
  display_label TEXT,
  order_index   INTEGER NOT NULL,
  is_visible    BOOLEAN DEFAULT TRUE,
  UNIQUE(section_id, field_id),
  UNIQUE(section_id, order_index) DEFERRABLE INITIALLY DEFERRED
);

-- Document fields display config
CREATE TABLE IF NOT EXISTS listing_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id   UUID NOT NULL REFERENCES "election"(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES "tenants"(id) ON DELETE CASCADE,
  field_id      UUID NOT NULL REFERENCES "form field"(id) ON DELETE CASCADE,
  display_label TEXT,
  is_visible    BOOLEAN DEFAULT TRUE,
  order_index   INTEGER NOT NULL,
  UNIQUE(election_id, field_id)
);

-- Note: We use "DEFERRABLE INITIALLY DEFERRED" for order_index UNIQUE constraints
-- to allow easy swapping of indexes during reordering without triggering constraint errors mid-transaction.

-- ==========================================
-- RLS Policies
-- ==========================================

ALTER TABLE candidate_listing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_section_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_documents ENABLE ROW LEVEL SECURITY;

-- Tenant Policy Helper
-- We allow tenant users to control these tables if they own the tenant.
CREATE POLICY "Tenant can manage their candidate listing config"
  ON candidate_listing_config
  FOR ALL
  USING (tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()));

CREATE POLICY "Tenant can manage their listing sections"
  ON listing_sections
  FOR ALL
  USING (tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()));

CREATE POLICY "Tenant can manage their listing section fields"
  ON listing_section_fields
  FOR ALL
  USING (tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()));

CREATE POLICY "Tenant can manage their listing documents"
  ON listing_documents
  FOR ALL
  USING (tenant_id = (SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()));
