-- Migration: 018_enforce_max_appeals_trigger.sql
-- Enforce maxAppeals at DB level by preventing new insertions that exceed the configured limit

CREATE OR REPLACE FUNCTION enforce_max_appeals_per_candidate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  max_allowed INT := 1;
  current_count INT := 0;
BEGIN
  SELECT COALESCE((SELECT "maxAppeals" FROM "appeal config" WHERE "electionID" = NEW."electionID" LIMIT 1), 1)
  INTO max_allowed;

  SELECT COUNT(*) INTO current_count FROM "appeals"
    WHERE "candidateID" = NEW."candidateID" AND "electionID" = NEW."electionID";

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Max appeals reached for candidate (%): allowed %', NEW."candidateID", max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_appeals ON "appeals";
CREATE TRIGGER trg_enforce_max_appeals
BEFORE INSERT ON "appeals"
FOR EACH ROW EXECUTE FUNCTION enforce_max_appeals_per_candidate();
