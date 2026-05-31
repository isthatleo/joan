CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "description" text,
  "currency" text DEFAULT 'USD' NOT NULL,
  "monthly_price" numeric(14, 2) DEFAULT '0' NOT NULL,
  "yearly_price" numeric(14, 2) DEFAULT '0' NOT NULL,
  "staff_limit" integer DEFAULT 0 NOT NULL,
  "client_limit" integer DEFAULT 0 NOT NULL,
  "storage_gb" integer DEFAULT 0 NOT NULL,
  "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "support_level" text DEFAULT 'standard' NOT NULL,
  "billing_cycle" text DEFAULT 'monthly' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_code_idx" ON "subscription_plans" ("code");
CREATE INDEX IF NOT EXISTS "subscription_plans_active_idx" ON "subscription_plans" ("is_active");

CREATE TABLE IF NOT EXISTS "platform_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid REFERENCES "tenants"("id"),
  "plan_id" uuid REFERENCES "subscription_plans"("id"),
  "invoice_number" text NOT NULL UNIQUE,
  "status" text DEFAULT 'draft' NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
  "tax" numeric(14, 2) DEFAULT '0' NOT NULL,
  "total" numeric(14, 2) DEFAULT '0' NOT NULL,
  "amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
  "billing_email" text,
  "billing_name" text,
  "issued_at" timestamp DEFAULT now() NOT NULL,
  "due_at" timestamp NOT NULL,
  "paid_at" timestamp,
  "period_start" timestamp,
  "period_end" timestamp,
  "line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS "platform_invoice_tenant_idx" ON "platform_invoices" ("tenant_id");
CREATE INDEX IF NOT EXISTS "platform_invoice_status_idx" ON "platform_invoices" ("status");
CREATE INDEX IF NOT EXISTS "platform_invoice_due_idx" ON "platform_invoices" ("due_at");
