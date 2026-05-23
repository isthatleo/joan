-- Accountant financial tables: expenses, accounts payable, budgets, journal entries, tax records
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "category" text NOT NULL,
  "vendor" text,
  "description" text,
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'USD',
  "expense_date" date NOT NULL DEFAULT CURRENT_DATE,
  "payment_method" text,
  "reference" text,
  "status" text NOT NULL DEFAULT 'pending',
  "receipt_url" text,
  "approved_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_tenant_idx" ON "expenses" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" ("expense_date");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "accounts_payable" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "vendor" text NOT NULL,
  "vendor_email" text,
  "invoice_number" text,
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "amount_paid" numeric(14,2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'USD',
  "issue_date" date NOT NULL DEFAULT CURRENT_DATE,
  "due_date" date,
  "status" text NOT NULL DEFAULT 'open',
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ap_tenant_idx" ON "accounts_payable" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ap_status_idx" ON "accounts_payable" ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "category" text,
  "period" text NOT NULL DEFAULT 'monthly',
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "spent" numeric(14,2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'USD',
  "start_date" date NOT NULL DEFAULT CURRENT_DATE,
  "end_date" date,
  "status" text NOT NULL DEFAULT 'active',
  "metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budgets_tenant_idx" ON "budgets" ("tenant_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "entry_date" date NOT NULL DEFAULT CURRENT_DATE,
  "reference" text,
  "description" text,
  "debit_account" text NOT NULL,
  "credit_account" text NOT NULL,
  "amount" numeric(14,2) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'USD',
  "posted_by" uuid,
  "status" text NOT NULL DEFAULT 'posted',
  "metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_tenant_idx" ON "journal_entries" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_date_idx" ON "journal_entries" ("entry_date");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp,
  "tenant_id" uuid NOT NULL,
  "period" text NOT NULL,
  "tax_type" text NOT NULL,
  "jurisdiction" text,
  "taxable_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(14,2) NOT NULL DEFAULT 0,
  "rate" numeric(6,4) NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'USD',
  "due_date" date,
  "filed_at" timestamp,
  "status" text NOT NULL DEFAULT 'draft',
  "reference" text,
  "metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tax_records_tenant_idx" ON "tax_records" ("tenant_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_send_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "tenant_id" uuid,
  "to_address" text NOT NULL,
  "from_address" text,
  "subject" text,
  "template" text,
  "status" text NOT NULL DEFAULT 'queued',
  "provider" text DEFAULT 'resend',
  "provider_message_id" text,
  "error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_log_tenant_idx" ON "email_send_log" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_log_status_idx" ON "email_send_log" ("status");
