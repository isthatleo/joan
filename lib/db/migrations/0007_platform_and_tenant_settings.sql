-- Platform-wide settings (singleton key/value)
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text UNIQUE NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" uuid
);

-- Per-tenant settings
CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "updated_by" uuid,
  UNIQUE("tenant_id", "key")
);

CREATE INDEX IF NOT EXISTS "tenant_settings_tenant_idx" ON "tenant_settings"("tenant_id");
