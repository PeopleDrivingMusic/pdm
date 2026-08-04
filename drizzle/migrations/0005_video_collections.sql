CREATE TABLE IF NOT EXISTS "content"."video_collections" (
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
CREATE TABLE IF NOT EXISTS "content"."video_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_collection_items_collection_id_video_id_unique" UNIQUE("collection_id","video_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."video_collections" ADD CONSTRAINT "video_collections_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."video_collection_items" ADD CONSTRAINT "video_collection_items_collection_id_video_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "content"."video_collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "content"."video_collection_items" ADD CONSTRAINT "video_collection_items_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "content"."videos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_collections_artist_id_status_idx" ON "content"."video_collections" ("artist_id","status");
