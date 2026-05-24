CREATE TABLE IF NOT EXISTS "message_call_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid REFERENCES "tenants"("id"),
  "caller_id" uuid NOT NULL REFERENCES "users"("id"),
  "callee_id" uuid NOT NULL REFERENCES "users"("id"),
  "call_type" text NOT NULL,
  "status" text DEFAULT 'ringing' NOT NULL,
  "offer" jsonb,
  "answer" jsonb,
  "caller_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "callee_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp,
  "expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "message_call_caller_idx" ON "message_call_sessions" ("caller_id");
CREATE INDEX IF NOT EXISTS "message_call_callee_idx" ON "message_call_sessions" ("callee_id");
CREATE INDEX IF NOT EXISTS "message_call_status_idx" ON "message_call_sessions" ("status");
CREATE INDEX IF NOT EXISTS "message_call_expires_idx" ON "message_call_sessions" ("expires_at");
