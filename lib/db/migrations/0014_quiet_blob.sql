CREATE TABLE "accountant_report_templates" (
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
--> statement-breakpoint
CREATE TABLE "accountant_reports" (
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
--> statement-breakpoint
CREATE TABLE "accounts_payable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"vendor" text NOT NULL,
	"vendor_email" text,
	"invoice_number" text,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"period" text DEFAULT 'monthly' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"spent" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "email_send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" uuid,
	"to_address" text NOT NULL,
	"from_address" text,
	"subject" text,
	"template" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider" text DEFAULT 'resend',
	"provider_message_id" text,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"category" text NOT NULL,
	"vendor" text,
	"description" text,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" text,
	"reference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"receipt_url" text,
	"approved_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"reference" text,
	"description" text,
	"debit_account" text NOT NULL,
	"credit_account" text NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"posted_by" uuid,
	"status" text DEFAULT 'posted' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "scheduled_accountant_reports" (
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
--> statement-breakpoint
CREATE TABLE "tax_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"period" text NOT NULL,
	"tax_type" text NOT NULL,
	"jurisdiction" text,
	"taxable_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rate" numeric(6, 4) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"due_date" date,
	"filed_at" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"reference" text,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "policy_id" uuid;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "claim_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "approved_amount" numeric(14, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "submitted_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "denial_reason" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "appeal_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "documents" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "accountant_reports" ADD CONSTRAINT "accountant_reports_template_id_accountant_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."accountant_report_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_accountant_reports" ADD CONSTRAINT "scheduled_accountant_reports_template_id_accountant_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."accountant_report_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accountant_report_templates_tenant_idx" ON "accountant_report_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "accountant_report_templates_key_idx" ON "accountant_report_templates" USING btree ("key");--> statement-breakpoint
CREATE INDEX "accountant_reports_tenant_idx" ON "accountant_reports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "accountant_reports_template_idx" ON "accountant_reports" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "ap_tenant_idx" ON "accounts_payable" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ap_status_idx" ON "accounts_payable" USING btree ("status");--> statement-breakpoint
CREATE INDEX "budgets_tenant_idx" ON "budgets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "email_log_tenant_idx" ON "email_send_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "email_log_status_idx" ON "email_send_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expenses_tenant_idx" ON "expenses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "journal_tenant_idx" ON "journal_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "journal_date_idx" ON "journal_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "scheduled_accountant_reports_tenant_idx" ON "scheduled_accountant_reports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scheduled_accountant_reports_template_idx" ON "scheduled_accountant_reports" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "tax_records_tenant_idx" ON "tax_records" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_policy_id_insurance_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."insurance_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "claims_tenant_idx" ON "claims" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "claims_invoice_idx" ON "claims" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "claims_policy_idx" ON "claims" USING btree ("policy_id");