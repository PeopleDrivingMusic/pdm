ALTER TABLE "artists" RENAME COLUMN "stage_name" TO "name";--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "slug" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_slug_unique" UNIQUE("slug");