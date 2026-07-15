ALTER TABLE "catalog"."albums"
	ADD COLUMN IF NOT EXISTS "visibility" varchar(16) DEFAULT 'public' NOT NULL;

ALTER TABLE "catalog"."tracks"
	ADD COLUMN IF NOT EXISTS "visibility" varchar(16) DEFAULT 'public' NOT NULL;

ALTER TABLE "catalog"."tracks"
	ADD COLUMN IF NOT EXISTS "content_id" uuid;
