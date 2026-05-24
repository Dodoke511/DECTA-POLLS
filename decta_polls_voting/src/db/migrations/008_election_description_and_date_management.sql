-- ============================================================
-- Migration: 008_election_description_and_date_management.sql
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add description column to election table
ALTER TABLE election 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create trigger to automatically set start_date when status becomes ACTIVE
CREATE OR REPLACE FUNCTION set_election_start_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being set to ACTIVE and start_date is not already set
  IF NEW."status" = 'ACTIVE' AND OLD."status" != 'ACTIVE' AND NEW."startDate" IS NULL THEN
    NEW."startDate" = NOW();
  END IF;
  
  -- If status is being set to COMPLETED and end_date is not already set
  IF NEW."status" = 'COMPLETED' AND OLD."status" != 'COMPLETED' AND NEW."endDate" IS NULL THEN
    NEW."endDate" = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic date management
DROP TRIGGER IF EXISTS manage_election_dates ON election;
CREATE TRIGGER manage_election_dates
BEFORE UPDATE ON election
FOR EACH ROW
EXECUTE FUNCTION set_election_start_date();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_election_status_dates ON election("status", "startDate", "endDate");
