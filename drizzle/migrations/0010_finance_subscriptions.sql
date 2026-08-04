CREATE TABLE IF NOT EXISTS "finance"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp,
	CONSTRAINT "subscriptions_user_artist_unique" UNIQUE("user_id","artist_id")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "finance"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "finance"."subscriptions" ADD CONSTRAINT "subscriptions_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
