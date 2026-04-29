CREATE TABLE "provisioning_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"status" text NOT NULL,
	"stage" text,
	"error_message" text,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ai_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guardian_consents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guardian_patients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guardians" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_logs" CASCADE;--> statement-breakpoint
DROP TABLE "events" CASCADE;--> statement-breakpoint
DROP TABLE "guardian_consents" CASCADE;--> statement-breakpoint
DROP TABLE "guardian_patients" CASCADE;--> statement-breakpoint
DROP TABLE "guardians" CASCADE;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "contact_phone" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "timezone" text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "admin_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "provisioning_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "provisioned_at" timestamp;--> statement-breakpoint
ALTER TABLE "provisioning_runs" ADD CONSTRAINT "provisioning_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provisioning_tenant_idx" ON "provisioning_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "provisioning_status_idx" ON "provisioning_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoice_tenant_idx" ON "invoices" USING btree ("tenant_id");