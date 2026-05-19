-- Migration: 017_create_decrement_rpc.sql
-- Creates RPC to decrement edits_remaining_after_appeal when a candidate submits their form after an approved appeal

CREATE OR REPLACE FUNCTION decrement_candidate_edits_after_appeal(user_id UUID, election_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE "candidate"
  SET "edits_remaining_after_appeal" = GREATEST(COALESCE("edits_remaining_after_appeal", 0) - 1, 0)
  WHERE "userID" = user_id AND "electionID" = election_id;
END;
$$;

-- GRANT EXECUTE ON FUNCTION decrement_candidate_edits_after_appeal(UUID, UUID) TO authenticated;
