ALTER TABLE "artist"."artists" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "artist"."artists" ADD COLUMN "origin" varchar(16) DEFAULT 'native' NOT NULL;--> statement-breakpoint
ALTER TABLE "artist"."artists" ADD COLUMN "external_id" varchar(64);--> statement-breakpoint
ALTER TABLE "artist"."artists" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "artist"."artists" ADD COLUMN "claimed_at" timestamp;--> statement-breakpoint
ALTER TABLE "finance"."subscriptions" ADD COLUMN "kind" varchar(16) DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."tracks" ADD COLUMN "audio_source" varchar(16) DEFAULT 'r2' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."tracks" ADD COLUMN "external_id" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "artists_origin_external_unique" ON "artist"."artists" USING btree ("origin","external_id") WHERE "artist"."artists"."origin" <> 'native';--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_source_external_unique" ON "catalog"."tracks" USING btree ("audio_source","external_id") WHERE "catalog"."tracks"."audio_source" <> 'r2';