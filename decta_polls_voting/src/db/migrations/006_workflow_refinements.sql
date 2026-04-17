-- ============================================================
-- Migration: 006_workflow_refinements.sql
-- ============================================================

-- 1. Update "appeal config" to support withdrawal
ALTER TABLE "appeal config" 
ADD COLUMN IF NOT EXISTS "allowWithdrawal" BOOLEAN DEFAULT false;

-- 2. Update "forms" to support flexible configuration/metadata
ALTER TABLE "forms"
ADD COLUMN IF NOT EXISTS "custom_logic_meta" JSONB DEFAULT '{}'::jsonb;

-- 3. Update "appeals" to support withdrawal status
-- (Assuming withdrawal is just a status on the appeal or a specific type)
-- For now, allowWithdrawal is the config flag. 

-- 4. Note: "form field" already has most of what we need, 
-- but we might want to flag certain fields as "system" fields later.

-- custom_logic_meta is a JSONB metadata bucket added to the forms table. Its purpose is to store form-level configurations and feature toggles that go beyond standard field definitions.
-- Current Use Cases:
-- Modular Feature Toggles: It tracks whether specialized "System" features are enabled for a specific form.
-- Example: hasParty: true — tells the system to enable the automated "Electoral Party Affiliation" smart input and pick-list logic for that candidate form.
-- Workflow Context: It allows us to save specific behaviors for a form (like whether it should auto-inject positions or use specific validation logic) without needing to add new columns to the database every time we add a modular feature.
-- Why not just add columns?
-- Instead of adding individual columns like is_party_form, is_position_form, etc., we use custom_logic_meta. This keeps the database schema clean and allows different workflow modules (Filing, Appeal, Screening) to store their unique requirements in a single, flexible field.

-- In your current code, it lives in 
-- CandidateFormBuilder.tsx
-- and is passed to the api/save_form route to ensure your "Party Affiliation" toggle persists between sessions.
