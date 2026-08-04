CREATE SCHEMA IF NOT EXISTS "content";
--> statement-breakpoint
DROP TABLE IF EXISTS "content"."artist_tags" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "content"."artist_posts" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "content"."artist_photos" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "content"."artist_videos" CASCADE;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"body_json" jsonb,
	"body_html" text,
	"excerpt" text,
	"cover_media_id" uuid,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"comments_enabled" boolean DEFAULT true NOT NULL,
	"reactions_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_artist_id_slug_unique" UNIQUE("artist_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."content_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"type" varchar(24) NOT NULL,
	"file_url" text NOT NULL,
	"thumbnail_url" text,
	"alt" varchar(240),
	"caption" text,
	"duration" integer,
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."post_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_post_id_media_id_unique" UNIQUE("post_id","media_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."post_music_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"track_id" uuid,
	"album_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."post_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"question" varchar(280) NOT NULL,
	"mode" varchar(16) DEFAULT 'single' NOT NULL,
	"closes_at" timestamp,
	"show_results" varchar(24) DEFAULT 'after_vote' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."post_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."post_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_poll_votes_poll_id_user_id_option_id_unique" UNIQUE("poll_id","user_id","option_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."photo_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"cover_photo_id" uuid,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photo_albums_artist_id_slug_unique" UNIQUE("artist_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"alt" varchar(240),
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"video_media_id" uuid,
	"thumbnail_url" text,
	"duration" integer,
	"processing_status" varchar(24) DEFAULT 'ready' NOT NULL,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "videos_artist_id_slug_unique" UNIQUE("artist_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content"."artist_feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"preview_text" text,
	"cover_url" text,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_feed_items_source_unique" UNIQUE("source_type","source_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."posts" ADD CONSTRAINT "posts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."content_media" ADD CONSTRAINT "content_media_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_media" ADD CONSTRAINT "post_media_media_id_content_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."content_media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_music_attachments" ADD CONSTRAINT "post_music_attachments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_music_attachments" ADD CONSTRAINT "post_music_attachments_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_music_attachments" ADD CONSTRAINT "post_music_attachments_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "catalog"."albums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_polls" ADD CONSTRAINT "post_polls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_poll_options" ADD CONSTRAINT "post_poll_options_poll_id_post_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "content"."post_polls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_poll_votes" ADD CONSTRAINT "post_poll_votes_poll_id_post_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "content"."post_polls"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_poll_votes" ADD CONSTRAINT "post_poll_votes_option_id_post_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "content"."post_poll_options"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."post_poll_votes" ADD CONSTRAINT "post_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."photo_albums" ADD CONSTRAINT "photo_albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."photos" ADD CONSTRAINT "photos_album_id_photo_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "content"."photo_albums"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."photos" ADD CONSTRAINT "photos_media_id_content_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."content_media"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."videos" ADD CONSTRAINT "videos_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."artist_feed_items" ADD CONSTRAINT "artist_feed_items_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_artist_id_status_idx" ON "content"."posts" ("artist_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_artist_id_published_at_idx" ON "content"."posts" ("artist_id","published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_media_artist_id_type_idx" ON "content"."content_media" ("artist_id","type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_feed_items_artist_id_status_idx" ON "content"."artist_feed_items" ("artist_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_feed_items_artist_id_published_at_idx" ON "content"."artist_feed_items" ("artist_id","published_at");
