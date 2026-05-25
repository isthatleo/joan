ALTER TABLE "feedbacks" ADD COLUMN "scope" text DEFAULT 'tenant' NOT NULL;--> statement-breakpoint
CREATE INDEX "feedback_scope_idx" ON "feedbacks" USING btree ("scope");