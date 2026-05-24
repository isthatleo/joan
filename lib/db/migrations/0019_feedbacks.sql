CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid REFERENCES "tenants"("id"),
  "user_id" uuid REFERENCES "users"("id"),
  "user_name" text,
  "user_email" text,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "priority" text DEFAULT 'medium' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "patient_feedback" boolean DEFAULT false NOT NULL,
  "assigned_to" uuid REFERENCES "users"("id"),
  "resolution" text,
  "resolved_at" timestamp
);

CREATE INDEX IF NOT EXISTS "feedback_tenant_idx" ON "feedbacks" ("tenant_id");
CREATE INDEX IF NOT EXISTS "feedback_user_idx" ON "feedbacks" ("user_id");
CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "feedbacks" ("status");
CREATE INDEX IF NOT EXISTS "feedback_type_idx" ON "feedbacks" ("type");
