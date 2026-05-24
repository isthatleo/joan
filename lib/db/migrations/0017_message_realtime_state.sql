CREATE TABLE IF NOT EXISTS "message_presence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "context" text DEFAULT 'messages' NOT NULL,
  "last_seen_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_presence_user_idx" ON "message_presence" ("user_id");
CREATE INDEX IF NOT EXISTS "message_presence_tenant_idx" ON "message_presence" ("tenant_id");
CREATE INDEX IF NOT EXISTS "message_presence_last_seen_idx" ON "message_presence" ("last_seen_at");

CREATE TABLE IF NOT EXISTS "message_typing_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "sender_id" uuid NOT NULL REFERENCES "users"("id"),
  "receiver_id" uuid NOT NULL REFERENCES "users"("id"),
  "expires_at" timestamp NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "message_typing_pair_idx" ON "message_typing_states" ("sender_id", "receiver_id");
CREATE INDEX IF NOT EXISTS "message_typing_receiver_idx" ON "message_typing_states" ("receiver_id");
CREATE INDEX IF NOT EXISTS "message_typing_expires_idx" ON "message_typing_states" ("expires_at");
