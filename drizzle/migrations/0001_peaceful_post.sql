DO $$
BEGIN
	IF to_regclass('public.artist_photos') IS NULL AND to_regclass('artist.artist_photos') IS NULL THEN
		CREATE TABLE "artist_photos" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"artist_id" uuid NOT NULL,
			"file_url" text NOT NULL,
			"tags" jsonb,
			"date" timestamp,
			"description" text,
			"stats" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_posts') IS NULL AND to_regclass('artist.artist_posts') IS NULL THEN
		CREATE TABLE "artist_posts" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"artist_id" uuid NOT NULL,
			"content" text NOT NULL,
			"images" jsonb,
			"widgets" jsonb,
			"tags" jsonb,
			"date" timestamp,
			"stats" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_tags') IS NULL AND to_regclass('artist.artist_tags') IS NULL THEN
		CREATE TABLE "artist_tags" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"artist_id" uuid NOT NULL,
			"tag" varchar(50) NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL,
			CONSTRAINT "artist_tags_artist_id_tag_unique" UNIQUE("artist_id","tag")
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_videos') IS NULL AND to_regclass('artist.artist_videos') IS NULL THEN
		CREATE TABLE "artist_videos" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"artist_id" uuid NOT NULL,
			"file_url" text NOT NULL,
			"tags" jsonb,
			"date" timestamp,
			"location" varchar(100),
			"description" text,
			"stats" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_photos') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_photos_artist_id_artists_id_fk') THEN
		ALTER TABLE "artist_photos" ADD CONSTRAINT "artist_photos_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_posts') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_posts_artist_id_artists_id_fk') THEN
		ALTER TABLE "artist_posts" ADD CONSTRAINT "artist_posts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_tags') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_tags_artist_id_artists_id_fk') THEN
		ALTER TABLE "artist_tags" ADD CONSTRAINT "artist_tags_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_videos') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_videos_artist_id_artists_id_fk') THEN
		ALTER TABLE "artist_videos" ADD CONSTRAINT "artist_videos_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
