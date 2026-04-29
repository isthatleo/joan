-- Tenant provisioning: extend tenants with contact/address/admin fields
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "contact_email" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "contact_phone" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'UTC';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "admin_user_id" uuid;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "provisioning_status" text DEFAULT 'pending';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "provisioned_at" timestamp;

-- Add tenant_id for multi-tenant isolation on tables that lacked it
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "lab_results" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "insurance_policies" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "claims" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;

-- Supporting indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS "invoice_tenant_idx" ON "invoices" ("tenant_id");
CREATE INDEX IF NOT EXISTS "prescriptions_tenant_idx" ON "prescriptions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "lab_orders_tenant_idx" ON "lab_orders" ("tenant_id");
CREATE INDEX IF NOT EXISTS "payments_tenant_idx" ON "payments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "notifications_tenant_idx" ON "notifications" ("tenant_id");
CREATE INDEX IF NOT EXISTS "messages_tenant_idx" ON "messages" ("tenant_id");
