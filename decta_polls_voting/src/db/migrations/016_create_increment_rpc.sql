-- Migration: 016_create_increment_rpc.sql
-- Creates a lightweight RPC to safely increment candidate.edits_remaining_after_appeal

CREATE OR REPLACE FUNCTION increment_candidate_edits_after_appeal(candidate_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE "candidate"
  SET "edits_remaining_after_appeal" = COALESCE("edits_remaining_after_appeal", 0) + 1
  WHERE id = candidate_id;
END;
$$;

-- Grant execute to authenticated role if needed (Supabase uses anon/internal roles)
-- GRANT EXECUTE ON FUNCTION increment_candidate_edits_after_appeal(UUID) TO authenticated;
