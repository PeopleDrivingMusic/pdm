CREATE SCHEMA IF NOT EXISTS "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artists" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_onboarding_requests" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_accounts" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_sessions" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_videos" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_photos" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_posts" SET SCHEMA "artist";
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."artist_tags" SET SCHEMA "artist";
