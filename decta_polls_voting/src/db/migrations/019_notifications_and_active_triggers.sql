-- Migration: 019_notifications_and_active_triggers.sql
-- Run this in your Supabase SQL Editor

-- 1. Add active_triggers column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_triggers TEXT[] DEFAULT ARRAY['Election Start', 'Election End', 'Candidate Added', 'Results Published', 'Vote Cast'];

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  election_id UUID REFERENCES election(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "tenant users"(id) ON DELETE CASCADE, -- NULL if broadcast/everyone of role_type
  role_type TEXT NOT NULL, -- 'tenant_admin' | 'candidate' | 'voter' | 'all'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'election_start' | 'election_end' | 'candidate_registered' | 'results_published' | 'vote_cast' | 'screening_decision'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create notification_reads table
CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "tenant users"(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Users can view notifications matching their tenant and role" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own read receipts" ON notification_reads;

-- 6. Create RLS Policies
CREATE POLICY "Users can view notifications matching their tenant and role"
  ON notifications
  FOR SELECT
  USING (
    tenant_id = (
      SELECT "tenantID" FROM "tenant users" WHERE id = auth.uid()
    )
    AND (
      -- Tenant admins can view admin notifications
      (
        EXISTS (
          SELECT 1 FROM "tenant users"
          WHERE id = auth.uid()
            AND LOWER(user_type) IN ('admin', 'sub-admin', 'tenant user')
        )
        AND role_type = 'tenant_admin'
      )
      OR
      -- Voters can view voter notifications
      (
        EXISTS (
          SELECT 1 FROM "tenant users"
          WHERE id = auth.uid()
            AND LOWER(user_type) = 'voter'
        )
        AND role_type IN ('voter', 'all')
        AND (user_id IS NULL OR user_id = auth.uid())
      )
      OR
      -- Candidates can view candidate notifications
      (
        EXISTS (
          SELECT 1 FROM "tenant users"
          WHERE id = auth.uid()
            AND LOWER(user_type) = 'candidate'
        )
        AND role_type IN ('candidate', 'all')
        AND (user_id IS NULL OR user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can manage their own read receipts"
  ON notification_reads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
