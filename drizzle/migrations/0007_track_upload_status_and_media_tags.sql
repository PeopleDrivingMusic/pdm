ALTER TABLE "catalog"."tracks"
	ADD COLUMN IF NOT EXISTS "status" varchar(32) DEFAULT 'draft' NOT NULL;

UPDATE "catalog"."tracks"
SET "status" = CASE
	WHEN "audio_url" IS NOT NULL THEN 'uploaded'
	ELSE 'draft'
END
WHERE "status" = 'draft';

CREATE INDEX IF NOT EXISTS "tracks_artist_status_idx"
	ON "catalog"."tracks" ("artist_id", "status");

CREATE INDEX IF NOT EXISTS "tracks_published_status_idx"
	ON "catalog"."tracks" ("is_published", "status");

CREATE INDEX IF NOT EXISTS "content_media_metadata_gin_idx"
	ON "content"."content_media" USING gin ("metadata");
