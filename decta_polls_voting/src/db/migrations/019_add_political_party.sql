-- Add political_party column to candidate table
ALTER TABLE candidate ADD COLUMN IF NOT EXISTS political_party VARCHAR(255) DEFAULT 'INDEPENDENT';
