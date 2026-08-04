CREATE SCHEMA IF NOT EXISTS "users";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "catalog";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "content";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "engagement";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "finance";
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.users') IS NOT NULL AND to_regclass('users.users') IS NULL THEN
		ALTER TABLE "public"."users" SET SCHEMA "users";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.sessions') IS NOT NULL AND to_regclass('users.sessions') IS NULL THEN
		ALTER TABLE "public"."sessions" SET SCHEMA "users";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.playlists') IS NOT NULL AND to_regclass('users.playlists') IS NULL THEN
		ALTER TABLE "public"."playlists" SET SCHEMA "users";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.playlist_tracks') IS NOT NULL AND to_regclass('users.playlist_tracks') IS NULL THEN
		ALTER TABLE "public"."playlist_tracks" SET SCHEMA "users";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.user_favorites') IS NOT NULL AND to_regclass('users.user_favorites') IS NULL THEN
		ALTER TABLE "public"."user_favorites" SET SCHEMA "users";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.genres') IS NOT NULL AND to_regclass('catalog.genres') IS NULL THEN
		ALTER TABLE "public"."genres" SET SCHEMA "catalog";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.albums') IS NOT NULL AND to_regclass('catalog.albums') IS NULL THEN
		ALTER TABLE "public"."albums" SET SCHEMA "catalog";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.tracks') IS NOT NULL AND to_regclass('catalog.tracks') IS NULL THEN
		ALTER TABLE "public"."tracks" SET SCHEMA "catalog";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.album_tracks') IS NOT NULL AND to_regclass('catalog.album_tracks') IS NULL THEN
		ALTER TABLE "public"."album_tracks" SET SCHEMA "catalog";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.track_stats') IS NOT NULL AND to_regclass('engagement.track_stats') IS NULL THEN
		ALTER TABLE "public"."track_stats" SET SCHEMA "engagement";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('public.purchases') IS NOT NULL AND to_regclass('finance.purchases') IS NULL THEN
		ALTER TABLE "public"."purchases" SET SCHEMA "finance";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('artist.artist_posts') IS NOT NULL AND to_regclass('content.artist_posts') IS NULL THEN
		ALTER TABLE "artist"."artist_posts" SET SCHEMA "content";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('artist.artist_photos') IS NOT NULL AND to_regclass('content.artist_photos') IS NULL THEN
		ALTER TABLE "artist"."artist_photos" SET SCHEMA "content";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('artist.artist_videos') IS NOT NULL AND to_regclass('content.artist_videos') IS NULL THEN
		ALTER TABLE "artist"."artist_videos" SET SCHEMA "content";
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF to_regclass('artist.artist_tags') IS NOT NULL AND to_regclass('content.artist_tags') IS NULL THEN
		ALTER TABLE "artist"."artist_tags" SET SCHEMA "content";
	END IF;
END $$;
