CREATE SCHEMA IF NOT EXISTS "artist";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "users";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "catalog";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "content";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "engagement";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "finance";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "messages";--> statement-breakpoint
CREATE TABLE "catalog"."album_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"track_number" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog"."albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"cover_image_url" text,
	"release_date" timestamp,
	"price" integer,
	"is_published" boolean DEFAULT false,
	"visibility" varchar(16) DEFAULT 'public' NOT NULL,
	"genres" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist"."artist_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"login" varchar(100) NOT NULL,
	"hashed_password" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_accounts_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "content"."artist_feed_items" (
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
CREATE TABLE "artist"."artist_onboarding_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"listeners_count" integer DEFAULT 0 NOT NULL,
	"social_links" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp,
	"reviewer_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist"."artist_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist"."artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"cover_img" text,
	"avatar" text,
	"genre" varchar(50),
	"description" text,
	"social_links" jsonb,
	"trust_score" numeric(3, 2) DEFAULT '3.00' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "engagement"."comment_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_user_unique" UNIQUE("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "messages"."comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content"."content_media" (
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
CREATE TABLE "catalog"."genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "content"."photo_albums" (
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
CREATE TABLE "content"."photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"alt" varchar(240),
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users"."playlist_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users"."playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"cover_image_url" text,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement"."post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_user_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "content"."post_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_media_post_id_media_id_unique" UNIQUE("post_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "content"."post_music_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"track_id" uuid,
	"album_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."post_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."post_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_poll_votes_poll_id_user_id_option_id_unique" UNIQUE("poll_id","user_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "content"."post_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"question" varchar(280),
	"mode" varchar(16) DEFAULT 'single' NOT NULL,
	"closes_at" timestamp,
	"show_results" varchar(24) DEFAULT 'after_vote' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."posts" (
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
CREATE TABLE "finance"."purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid,
	"album_id" uuid,
	"price" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"transaction_hash" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp,
	CONSTRAINT "subscriptions_user_artist_unique" UNIQUE("user_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "engagement"."track_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"save_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "track_stats_track_id_unique" UNIQUE("track_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid,
	"artist_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"duration" integer,
	"audio_url" text,
	"lyrics" text,
	"clip_url" text,
	"image_url" text,
	"track_number" integer,
	"genres" jsonb,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"is_published" boolean DEFAULT false,
	"visibility" varchar(16) DEFAULT 'public' NOT NULL,
	"content_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users"."user_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50),
	"display_name" varchar(100),
	"avatar_url" text,
	"bio" text,
	"wallet_address" varchar(100),
	"is_verified" boolean DEFAULT false,
	"google_id" varchar(255),
	"hashed_password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"trust_score" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "content"."video_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_collection_items_collection_id_video_id_unique" UNIQUE("collection_id","video_id")
);
--> statement-breakpoint
CREATE TABLE "content"."video_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"cover_video_id" uuid,
	"visibility" varchar(24) DEFAULT 'public' NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_collections_artist_id_slug_unique" UNIQUE("artist_id","slug")
);
--> statement-breakpoint
CREATE TABLE "content"."videos" (
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
ALTER TABLE "catalog"."album_tracks" ADD CONSTRAINT "album_tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "catalog"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."album_tracks" ADD CONSTRAINT "album_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."albums" ADD CONSTRAINT "albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist"."artist_accounts" ADD CONSTRAINT "artist_accounts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."artist_feed_items" ADD CONSTRAINT "artist_feed_items_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist"."artist_onboarding_requests" ADD CONSTRAINT "artist_onboarding_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist"."artist_sessions" ADD CONSTRAINT "artist_sessions_artist_account_id_artist_accounts_id_fk" FOREIGN KEY ("artist_account_id") REFERENCES "artist"."artist_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist"."artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement"."comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "messages"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement"."comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages"."comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."content_media" ADD CONSTRAINT "content_media_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."photo_albums" ADD CONSTRAINT "photo_albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."photos" ADD CONSTRAINT "photos_album_id_photo_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "content"."photo_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."photos" ADD CONSTRAINT "photos_media_id_content_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."content_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users"."playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "users"."playlists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users"."playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users"."playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement"."post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement"."post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_media" ADD CONSTRAINT "post_media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_media" ADD CONSTRAINT "post_media_media_id_content_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "content"."content_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_music_attachments" ADD CONSTRAINT "post_music_attachments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_music_attachments" ADD CONSTRAINT "post_music_attachments_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_music_attachments" ADD CONSTRAINT "post_music_attachments_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "catalog"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_poll_options" ADD CONSTRAINT "post_poll_options_poll_id_post_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "content"."post_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_poll_votes" ADD CONSTRAINT "post_poll_votes_poll_id_post_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "content"."post_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_poll_votes" ADD CONSTRAINT "post_poll_votes_option_id_post_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "content"."post_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_poll_votes" ADD CONSTRAINT "post_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."post_polls" ADD CONSTRAINT "post_polls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "content"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."posts" ADD CONSTRAINT "posts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."purchases" ADD CONSTRAINT "purchases_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."purchases" ADD CONSTRAINT "purchases_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "catalog"."albums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."subscriptions" ADD CONSTRAINT "subscriptions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement"."track_stats" ADD CONSTRAINT "track_stats_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."tracks" ADD CONSTRAINT "tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "catalog"."albums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."tracks" ADD CONSTRAINT "tracks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users"."user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users"."user_favorites" ADD CONSTRAINT "user_favorites_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "catalog"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."video_collection_items" ADD CONSTRAINT "video_collection_items_collection_id_video_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "content"."video_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."video_collection_items" ADD CONSTRAINT "video_collection_items_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "content"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."video_collections" ADD CONSTRAINT "video_collections_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."videos" ADD CONSTRAINT "videos_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_feed_items_artist_id_status_idx" ON "content"."artist_feed_items" USING btree ("artist_id","status");--> statement-breakpoint
CREATE INDEX "artist_feed_items_artist_id_published_at_idx" ON "content"."artist_feed_items" USING btree ("artist_id","published_at");--> statement-breakpoint
CREATE INDEX "comments_target_idx" ON "messages"."comments" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_author_idx" ON "messages"."comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "content_media_artist_id_type_idx" ON "content"."content_media" USING btree ("artist_id","type");--> statement-breakpoint
CREATE INDEX "posts_artist_id_status_idx" ON "content"."posts" USING btree ("artist_id","status");--> statement-breakpoint
CREATE INDEX "posts_artist_id_published_at_idx" ON "content"."posts" USING btree ("artist_id","published_at");--> statement-breakpoint
CREATE INDEX "video_collections_artist_id_status_idx" ON "content"."video_collections" USING btree ("artist_id","status");--> statement-breakpoint
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
$$;--> statement-breakpoint
CREATE TRIGGER artist_onboarding_approved_activate
AFTER UPDATE OF status ON "artist"."artist_onboarding_requests"
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION public.set_artist_active_on_approved();