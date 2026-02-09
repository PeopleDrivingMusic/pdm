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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "artist_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"artist_account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_accounts" ADD CONSTRAINT "artist_accounts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_onboarding_requests" ADD CONSTRAINT "artist_onboarding_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_sessions" ADD CONSTRAINT "artist_sessions_artist_account_id_artist_accounts_id_fk" FOREIGN KEY ("artist_account_id") REFERENCES "public"."artist_accounts"("id") ON DELETE cascade ON UPDATE no action;