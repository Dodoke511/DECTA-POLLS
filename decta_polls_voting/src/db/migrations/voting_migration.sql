-- Tables for Public Election Site Voting and Results

-- Core base tables


CREATE TABLE IF NOT EXISTS ballots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES election(id),
  position_id BIGINT NOT NULL REFERENCES positions(id),
  UNIQUE(election_id, position_id)
);

CREATE TABLE IF NOT EXISTS vote_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES election(id),
  voter_id UUID NOT NULL REFERENCES "tenant users"(id),
  token_hash TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  UNIQUE(election_id, voter_id)
);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id UUID NOT NULL REFERENCES ballots(id),
  encrypted_payload TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vote_tallies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES election(id),
  position_id BIGINT NOT NULL REFERENCES positions(id),
  candidate_id UUID NOT NULL REFERENCES candidate(id),
  vote_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(election_id, position_id, candidate_id)
);
-- Stores ranked vote choices (enterprise ranked voting)
CREATE TABLE IF NOT EXISTS ranked_vote_choices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id      UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidate(id),
  rank_position INTEGER NOT NULL,
  -- 1 = first choice, 2 = second choice, etc.
  UNIQUE(vote_id, candidate_id),
  UNIQUE(vote_id, rank_position)
);

-- Stores abstain votes separately from candidate votes
CREATE TABLE IF NOT EXISTS abstain_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES election(id),
  position_id BIGINT NOT NULL REFERENCES positions(id),
  ballot_id   UUID NOT NULL REFERENCES ballots(id),
  timestamp   TIMESTAMPTZ DEFAULT now()
);

-- Stores final computed results (populated after voting ends)
CREATE TABLE IF NOT EXISTS election_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  UUID NOT NULL REFERENCES election(id),
  position_id  BIGINT NOT NULL REFERENCES positions(id),
  candidate_id UUID REFERENCES candidate(id),
  -- NULL when result row represents abstain count
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  vote_count   INTEGER NOT NULL DEFAULT 0,
  rank         INTEGER,
  -- 1 = winner, 2 = second, etc. NULL if not applicable
  is_winner    BOOLEAN DEFAULT FALSE,
  abstain_count INTEGER DEFAULT 0,
  computed_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(election_id, position_id, candidate_id)
);

-- Tracks ballot session integrity for monitoring
CREATE TABLE IF NOT EXISTS ballot_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES election(id),
  voter_id        UUID NOT NULL REFERENCES "tenant users"(id),
  token_hash      TEXT NOT NULL,
  started_at      TIMESTAMPTZ DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  -- NULL = not yet submitted
  tab_blur_count  INTEGER DEFAULT 0,
  -- how many times voter left the ballot tab
  visibility_blur_count INTEGER DEFAULT 0,
  -- how many times document became hidden
  integrity_warnings INTEGER DEFAULT 0,
  -- total warning events logged
  status          TEXT DEFAULT 'active'
                  CHECK (status IN ('active','submitted','expired','flagged')),
  UNIQUE(election_id, voter_id)
);

-- Add encryption keys to election table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'election' AND column_name = 'encryption_key_public') THEN
        ALTER TABLE election ADD COLUMN encryption_key_public TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'election' AND column_name = 'encryption_key_private') THEN
        ALTER TABLE election ADD COLUMN encryption_key_private TEXT;
    END IF;
END $$;

-- Voting Config - Already exists in standard migrations? Adding check to be safe
CREATE TABLE IF NOT EXISTS voting_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES election(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  voting_method TEXT DEFAULT 'standard',
  abstain_allowed BOOLEAN DEFAULT true,
  ballot_layout TEXT DEFAULT 'step_by_step',
  show_candidate_photos BOOLEAN DEFAULT true,
  show_position_desc BOOLEAN DEFAULT true,
  show_candidate_listing_link BOOLEAN DEFAULT true,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  UNIQUE(election_id)
);

-- Results Config
CREATE TABLE IF NOT EXISTS results_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES election(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  publish_mode TEXT DEFAULT 'manual',
  publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  results_visibility TEXT DEFAULT 'voters',
  show_vote_counts BOOLEAN DEFAULT true,
  show_winner_prominently BOOLEAN DEFAULT true,
  show_turnout_stats BOOLEAN DEFAULT true,
  enable_dept_heatmap BOOLEAN DEFAULT false,
  enable_results_download BOOLEAN DEFAULT true,
  download_format TEXT DEFAULT 'pdf',
  download_visibility TEXT DEFAULT 'admin',
  enable_audit_export BOOLEAN DEFAULT false,
  UNIQUE(election_id)
);

-- RPC: submit_vote
CREATE OR REPLACE FUNCTION submit_vote(
  p_token_hash    TEXT,
  p_election_id   UUID,
  p_voter_id      UUID,
  p_vote_payloads JSONB,
  p_session_id    UUID
) RETURNS JSONB AS $$
DECLARE
  v_token         vote_tokens%ROWTYPE;
  v_payload       JSONB;
  v_vote_id       UUID;
  v_position_id   BIGINT;
  v_ballot_id     UUID;
  v_choice        JSONB;
BEGIN
  -- 1. Verify and lock vote token (FOR UPDATE prevents race condition)
  SELECT * INTO v_token
  FROM vote_tokens
  WHERE token_hash = p_token_hash
    AND election_id = p_election_id
    AND voter_id    = p_voter_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_TOKEN: Vote token not found';
  END IF;

  IF v_token.used THEN
    RAISE EXCEPTION 'TOKEN_USED: Vote has already been submitted';
  END IF;

  -- 2. Process each position payload
  FOR v_payload IN SELECT * FROM jsonb_array_elements(p_vote_payloads)
  LOOP
    v_position_id := (v_payload->>'position_id')::BIGINT;
    v_ballot_id   := (v_payload->>'ballot_id')::UUID;

    IF (v_payload->>'is_abstain')::BOOLEAN THEN
      -- Record abstain vote
      INSERT INTO abstain_votes
        (election_id, position_id, ballot_id)
      VALUES
        (p_election_id, v_position_id, v_ballot_id);
    ELSE
      -- Record encrypted vote
      INSERT INTO votes (ballot_id, encrypted_payload, timestamp)
      VALUES (
        v_ballot_id,
        v_payload->>'encrypted_payload',
        now()
      )
      RETURNING id INTO v_vote_id;

      -- If ranked voting: store ranked choices
      IF v_payload->'ranked_choices' IS NOT NULL THEN
        FOR v_choice IN
          SELECT * FROM jsonb_array_elements(v_payload->'ranked_choices')
        LOOP
          INSERT INTO ranked_vote_choices
            (vote_id, candidate_id, rank_position)
          VALUES (
            v_vote_id,
            (v_choice->>'candidate_id')::UUID,
            (v_choice->>'rank')::INTEGER
          );
        END LOOP;
      ELSE
        -- Standard voting: increment tally immediately
        -- Extract candidate_id from encrypted_payload is NOT done here
        -- Tally is updated via separate secure function
        -- (vote content stays encrypted — tally updated by
        --  passing candidate_id separately in payload metadata)
        UPDATE vote_tallies
        SET vote_count = vote_count + 1
        WHERE election_id  = p_election_id
          AND position_id  = v_position_id
          AND candidate_id = (v_payload->>'candidate_id')::UUID;

        -- Insert if not exists
        IF NOT FOUND THEN
          INSERT INTO vote_tallies
            (election_id, position_id, candidate_id, vote_count)
          VALUES
            (p_election_id, v_position_id,
             (v_payload->>'candidate_id')::UUID, 1);
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 3. Mark token as used (prevents double voting)
  UPDATE vote_tokens
  SET used = TRUE
  WHERE id = v_token.id;

  -- 4. Mark ballot session as submitted
  UPDATE ballot_sessions
  SET status       = 'submitted',
      submitted_at = now()
  WHERE id = p_session_id;

  -- 5. Insert audit log entry
  INSERT INTO "audit logs"
    ("tenantID", "electionID", "actorID", "actionType",
     "targetID", metadata)
  SELECT
    e."tenantID",
    p_election_id,
    p_voter_id,
    'vote_submitted',
    v_token.id,
    jsonb_build_object(
      'session_id',      p_session_id,
      'positions_voted', jsonb_array_length(p_vote_payloads),
      'submitted_at',    now()
    )
  FROM election e WHERE e.id = p_election_id;
  
  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
    -- Transaction auto-rolls back on exception
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: compute_election_results
CREATE OR REPLACE FUNCTION compute_election_results(
  p_election_id UUID,
  p_tenant_id   UUID
) RETURNS VOID AS $$
DECLARE
  v_position    RECORD;
  v_tally       RECORD;
  v_rank        INTEGER;
  v_abstain_count INTEGER;
BEGIN
  -- Process each position
  FOR v_position IN
    SELECT id, seats_available
    FROM positions
    WHERE election_id = p_election_id
  LOOP
    v_rank := 1;

    -- Get abstain count for this position
    SELECT COUNT(*) INTO v_abstain_count
    FROM abstain_votes
    WHERE election_id = p_election_id
      AND position_id = v_position.id;

    -- Insert/update results for each candidate
    -- ordered by vote count descending
    FOR v_tally IN
      SELECT candidate_id, vote_count
      FROM vote_tallies
      WHERE election_id = p_election_id
        AND position_id = v_position.id
      ORDER BY vote_count DESC
    LOOP
      INSERT INTO election_results
        (election_id, position_id, candidate_id, tenant_id,
         vote_count, rank, is_winner, abstain_count)
      VALUES (
        p_election_id,
        v_position.id,
        v_tally.candidate_id,
        p_tenant_id,
        v_tally.vote_count,
        v_rank,
        v_rank <= v_position.seats_available,
        v_abstain_count
      )
      ON CONFLICT (election_id, position_id, candidate_id)
      DO UPDATE SET
        vote_count    = EXCLUDED.vote_count,
        rank          = EXCLUDED.rank,
        is_winner     = EXCLUDED.is_winner,
        abstain_count = EXCLUDED.abstain_count,
        computed_at   = now();

      v_rank := v_rank + 1;
    END LOOP;
  END LOOP;

  -- Audit log
  INSERT INTO "audit logs"
    ("tenantID", "electionID", "actorID", "actionType", metadata)
  VALUES (
    p_tenant_id, p_election_id, NULL,
    'results_computed',
    jsonb_build_object('computed_at', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: log_ballot_integrity_event
CREATE OR REPLACE FUNCTION log_ballot_integrity_event(
  p_session_id UUID,
  p_event_type TEXT
  -- 'tab_blur' | 'visibility_hidden' | 'focus_lost'
) RETURNS VOID AS $$
BEGIN
  UPDATE ballot_sessions
  SET
    tab_blur_count = CASE
      WHEN p_event_type = 'tab_blur'
      THEN tab_blur_count + 1
      ELSE tab_blur_count
    END,
    visibility_blur_count = CASE
      WHEN p_event_type = 'visibility_hidden'
      THEN visibility_blur_count + 1
      ELSE visibility_blur_count
    END,
    integrity_warnings = integrity_warnings + 1,
    status = CASE
      WHEN integrity_warnings + 1 >= 5 THEN 'flagged'
      ELSE status
    END
  WHERE id = p_session_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
