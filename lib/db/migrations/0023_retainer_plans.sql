CREATE TABLE IF NOT EXISTS "retainer_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "name" text NOT NULL,
  "code" text NOT NULL UNIQUE,
  "description" text,
  "currency" text DEFAULT 'USD' NOT NULL,
  "monthly_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
  "setup_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
  "response_sla_hours" integer DEFAULT 24 NOT NULL,
  "included_hours" integer DEFAULT 0 NOT NULL,
  "overage_rate" numeric(14, 2) DEFAULT '0' NOT NULL,
  "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid
);

CREATE INDEX IF NOT EXISTS "retainer_plans_active_idx" ON "retainer_plans" ("is_active");
