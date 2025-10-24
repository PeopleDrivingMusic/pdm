ALTER TABLE "tracks" ALTER COLUMN "genres" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "clip_url" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "cover_url" text;