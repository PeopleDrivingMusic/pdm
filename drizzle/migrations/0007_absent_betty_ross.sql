ALTER TABLE "users" ALTER COLUMN "trust_score" SET DATA TYPE numeric(3, 2);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "trust_score" SET DEFAULT '0.00';