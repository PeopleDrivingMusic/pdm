-- IF NOT EXISTS: these 3 indexes were hand-added to the dev DB before this
-- baseline existed (see .claude/wiki/architecture/tech-debt.md) -- this
-- migration codifies them into schema.ts/migrations, it doesn't create them
-- fresh, and must stay a no-op on a DB that already has them.
CREATE INDEX IF NOT EXISTS "content_media_metadata_gin_idx" ON "content"."content_media" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracks_artist_status_idx" ON "catalog"."tracks" USING btree ("artist_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tracks_published_status_idx" ON "catalog"."tracks" USING btree ("is_published","status");