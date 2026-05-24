CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"user_name" text,
	"user_email" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"patient_feedback" boolean DEFAULT false NOT NULL,
	"assigned_to" uuid,
	"resolution" text,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_tenant_idx" ON "feedbacks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedbacks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedbacks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_type_idx" ON "feedbacks" USING btree ("type");