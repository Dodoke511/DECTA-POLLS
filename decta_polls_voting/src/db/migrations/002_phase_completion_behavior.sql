-- Add completion behavior columns to election phase table
ALTER TABLE "election phase" 
ADD COLUMN IF NOT EXISTS "completion_behavior" VARCHAR(50) DEFAULT 'require_all_reviewed',
ADD COLUMN IF NOT EXISTS "auto_resolve_action" VARCHAR(50) DEFAULT 'auto_reject';
