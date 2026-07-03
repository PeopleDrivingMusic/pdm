-- Fix set_artist_active_on_approved(): it referenced the unqualified table
-- "artists", which fails from any session whose search_path excludes the
-- "artist" schema (e.g. manual SQL, approving an onboarding request by hand).
-- Schema-qualify the table and pin the function's search_path.
CREATE OR REPLACE FUNCTION public.set_artist_active_on_approved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = artist, public
AS $$
BEGIN
	IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
		UPDATE "artist"."artists"
		SET "is_active" = TRUE,
			"updated_at" = now()
		WHERE "user_id" = NEW.user_id;
	END IF;

	RETURN NEW;
END;
$$;
