ALTER TABLE "artists" ADD COLUMN "trust_score" numeric(3, 2) DEFAULT 3.00 NOT NULL;--> statement-breakpoint

CREATE OR REPLACE FUNCTION set_artist_active_on_approved()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
		UPDATE "artists"
		SET "is_active" = TRUE,
			"updated_at" = now()
		WHERE "user_id" = NEW.user_id;
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER artist_onboarding_approved_activate
AFTER UPDATE OF status ON "artist_onboarding_requests"
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION set_artist_active_on_approved();
