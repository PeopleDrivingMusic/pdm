CREATE TABLE "artist"."artist_claim_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist"."artist_claim_requests" ADD CONSTRAINT "artist_claim_requests_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "artist"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist"."artist_claim_requests" ADD CONSTRAINT "artist_claim_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artist_claim_requests_artist_user_unique" ON "artist"."artist_claim_requests" USING btree ("artist_id","user_id");