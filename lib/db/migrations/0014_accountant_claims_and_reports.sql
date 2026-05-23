ALTER TABLE "claims"
  ADD COLUMN IF NOT EXISTS "policy_id" uuid,
  ADD COLUMN IF NOT EXISTS "claim_amount" numeric(14, 2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "approved_amount" numeric(14, 2) DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "submitted_at" timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "processed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "denial_reason" text,
  ADD COLUMN IF NOT EXISTS "appeal_deadline" timestamp,
  ADD COLUMN IF NOT EXISTS "notes" text,
  ADD COLUMN IF NOT EXISTS "documents" jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'claims_policy_id_insurance_policies_id_fk'
  ) THEN
    ALTER TABLE "claims"
      ADD CONSTRAINT "claims_policy_id_insurance_policies_id_fk"
      FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policies"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "claims_tenant_idx" ON "claims" ("tenant_id");
CREATE INDEX IF NOT EXISTS "claims_invoice_idx" ON "claims" ("invoice_id");
CREATE INDEX IF NOT EXISTS "claims_policy_idx" ON "claims" ("policy_id");

ALTER TABLE "email_send_log"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS "accountant_report_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "frequency" text DEFAULT 'monthly' NOT NULL,
  "estimated_time" text DEFAULT '1-2 minutes',
  "config" jsonb DEFAULT '{}'::jsonb,
  "is_system" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "accountant_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "template_id" uuid,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'ready' NOT NULL,
  "format" text DEFAULT 'pdf' NOT NULL,
  "size" text,
  "generated_at" timestamp DEFAULT now() NOT NULL,
  "download_url" text,
  "requested_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "scheduled_accountant_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "template_id" uuid,
  "name" text NOT NULL,
  "frequency" text NOT NULL,
  "next_run" timestamp NOT NULL,
  "recipients" jsonb DEFAULT '[]'::jsonb,
  "format" text DEFAULT 'pdf' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'accountant_reports_template_id_accountant_report_templates_id_fk'
  ) THEN
    ALTER TABLE "accountant_reports"
      ADD CONSTRAINT "accountant_reports_template_id_accountant_report_templates_id_fk"
      FOREIGN KEY ("template_id") REFERENCES "public"."accountant_report_templates"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'scheduled_accountant_reports_template_id_accountant_report_templates_id_fk'
  ) THEN
    ALTER TABLE "scheduled_accountant_reports"
      ADD CONSTRAINT "scheduled_accountant_reports_template_id_accountant_report_templates_id_fk"
      FOREIGN KEY ("template_id") REFERENCES "public"."accountant_report_templates"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "accountant_report_templates_tenant_idx" ON "accountant_report_templates" ("tenant_id");
CREATE INDEX IF NOT EXISTS "accountant_report_templates_key_idx" ON "accountant_report_templates" ("key");
CREATE INDEX IF NOT EXISTS "accountant_reports_tenant_idx" ON "accountant_reports" ("tenant_id");
CREATE INDEX IF NOT EXISTS "accountant_reports_template_idx" ON "accountant_reports" ("template_id");
CREATE INDEX IF NOT EXISTS "scheduled_accountant_reports_tenant_idx" ON "scheduled_accountant_reports" ("tenant_id");
CREATE INDEX IF NOT EXISTS "scheduled_accountant_reports_template_idx" ON "scheduled_accountant_reports" ("template_id");
