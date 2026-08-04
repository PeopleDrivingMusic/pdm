CREATE SCHEMA IF NOT EXISTS "messages";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages"."comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "messages"."comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_target_idx" ON "messages"."comments" ("target_type","target_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_author_idx" ON "messages"."comments" ("author_id");
