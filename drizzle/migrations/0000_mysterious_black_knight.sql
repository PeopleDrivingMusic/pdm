DO $$
BEGIN
	IF to_regclass('public.artists') IS NULL AND to_regclass('artist.artists') IS NULL THEN
		CREATE TABLE "artists" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"user_id" uuid NOT NULL,
			"name" varchar(100) NOT NULL,
			"slug" varchar(100) NOT NULL,
			"cover_img" text,
			"avatar" text,
			"genre" varchar(50),
			"description" text,
			"social_links" jsonb,
			"is_active" boolean DEFAULT true,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL,
			"trust_score" numeric(3, 2) DEFAULT '3.00' NOT NULL,
			CONSTRAINT "artists_slug_unique" UNIQUE("slug")
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.tracks') IS NULL AND to_regclass('artist.tracks') IS NULL THEN
		CREATE TABLE "tracks" (
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
			"is_published" boolean DEFAULT false,
			"metadata" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.track_stats') IS NULL AND to_regclass('artist.track_stats') IS NULL THEN
		CREATE TABLE "track_stats" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"track_id" uuid NOT NULL,
			"like_count" integer DEFAULT 0 NOT NULL,
			"play_count" integer DEFAULT 0 NOT NULL,
			"save_count" integer DEFAULT 0 NOT NULL,
			"comment_count" integer DEFAULT 0 NOT NULL,
			"last_updated" timestamp DEFAULT now() NOT NULL,
			CONSTRAINT "track_stats_track_id_unique" UNIQUE("track_id")
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.purchases') IS NULL AND to_regclass('artist.purchases') IS NULL THEN
		CREATE TABLE "purchases" (
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
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.playlists') IS NULL AND to_regclass('artist.playlists') IS NULL THEN
		CREATE TABLE "playlists" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"user_id" uuid NOT NULL,
			"name" varchar(100) NOT NULL,
			"description" text,
			"cover_image_url" text,
			"is_public" boolean DEFAULT true,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.users') IS NULL AND to_regclass('artist.users') IS NULL THEN
		CREATE TABLE "users" (
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
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.playlist_tracks') IS NULL AND to_regclass('artist.playlist_tracks') IS NULL THEN
		CREATE TABLE "playlist_tracks" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"playlist_id" uuid NOT NULL,
			"track_id" uuid NOT NULL,
			"position" integer NOT NULL,
			"added_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.sessions') IS NULL AND to_regclass('artist.sessions') IS NULL THEN
		CREATE TABLE "sessions" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" uuid NOT NULL,
			"expires_at" timestamp with time zone NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.user_favorites') IS NULL AND to_regclass('artist.user_favorites') IS NULL THEN
		CREATE TABLE "user_favorites" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"user_id" uuid NOT NULL,
			"track_id" uuid NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.albums') IS NULL AND to_regclass('artist.albums') IS NULL THEN
		CREATE TABLE "albums" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"artist_id" uuid NOT NULL,
			"title" varchar(200) NOT NULL,
			"description" text,
			"cover_image_url" text,
			"release_date" timestamp,
			"price" integer,
			"is_published" boolean DEFAULT false,
			"metadata" jsonb,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL,
			"genres" jsonb
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_accounts') IS NULL AND to_regclass('artist.artist_accounts') IS NULL THEN
		CREATE TABLE "artist_accounts" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"artist_id" uuid NOT NULL,
			"login" varchar(100) NOT NULL,
			"hashed_password" text NOT NULL,
			"is_active" boolean DEFAULT true NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL,
			"updated_at" timestamp DEFAULT now() NOT NULL,
			CONSTRAINT "artist_accounts_login_unique" UNIQUE("login")
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_onboarding_requests') IS NULL AND to_regclass('artist.artist_onboarding_requests') IS NULL THEN
		CREATE TABLE "artist_onboarding_requests" (
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
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_sessions') IS NULL AND to_regclass('artist.artist_sessions') IS NULL THEN
		CREATE TABLE "artist_sessions" (
			"id" text PRIMARY KEY NOT NULL,
			"artist_account_id" uuid NOT NULL,
			"expires_at" timestamp with time zone NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.genres') IS NULL AND to_regclass('artist.genres') IS NULL THEN
		CREATE TABLE "genres" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"name" varchar(50) NOT NULL,
			"display_name" varchar(50) NOT NULL,
			"created_at" timestamp DEFAULT now() NOT NULL,
			CONSTRAINT "genres_name_unique" UNIQUE("name")
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.album_tracks') IS NULL AND to_regclass('artist.album_tracks') IS NULL THEN
		CREATE TABLE "album_tracks" (
			"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
			"album_id" uuid NOT NULL,
			"track_id" uuid NOT NULL,
			"track_number" integer NOT NULL,
			"added_at" timestamp DEFAULT now() NOT NULL
		);
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artists') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artists_user_id_users_id_fk') THEN
		ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.tracks') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_album_id_albums_id_fk') THEN
		ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.tracks') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_artist_id_artists_id_fk') THEN
		ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.track_stats') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_stats_track_id_tracks_id_fk') THEN
		ALTER TABLE "track_stats" ADD CONSTRAINT "track_stats_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.purchases') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_user_id_users_id_fk') THEN
		ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.purchases') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_track_id_tracks_id_fk') THEN
		ALTER TABLE "purchases" ADD CONSTRAINT "purchases_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.purchases') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_album_id_albums_id_fk') THEN
		ALTER TABLE "purchases" ADD CONSTRAINT "purchases_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.playlists') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlists_user_id_users_id_fk') THEN
		ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.playlist_tracks') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_tracks_playlist_id_playlists_id_fk') THEN
		ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.playlist_tracks') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'playlist_tracks_track_id_tracks_id_fk') THEN
		ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.sessions') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
		ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.user_favorites') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_favorites_user_id_users_id_fk') THEN
		ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.user_favorites') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_favorites_track_id_tracks_id_fk') THEN
		ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.albums') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'albums_artist_id_artists_id_fk') THEN
		ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_accounts') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_accounts_artist_id_artists_id_fk') THEN
		ALTER TABLE "artist_accounts" ADD CONSTRAINT "artist_accounts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_onboarding_requests') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_onboarding_requests_user_id_users_id_fk') THEN
		ALTER TABLE "artist_onboarding_requests" ADD CONSTRAINT "artist_onboarding_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.artist_sessions') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'artist_sessions_artist_account_id_artist_accounts_id_fk') THEN
		ALTER TABLE "artist_sessions" ADD CONSTRAINT "artist_sessions_artist_account_id_artist_accounts_id_fk" FOREIGN KEY ("artist_account_id") REFERENCES "public"."artist_accounts"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.album_tracks') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'album_tracks_album_id_albums_id_fk') THEN
		ALTER TABLE "album_tracks" ADD CONSTRAINT "album_tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF to_regclass('public.album_tracks') IS NOT NULL
		AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'album_tracks_track_id_tracks_id_fk') THEN
		ALTER TABLE "album_tracks" ADD CONSTRAINT "album_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
