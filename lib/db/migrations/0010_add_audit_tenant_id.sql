ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
CREATE INDEX "audit_tenant_idx" ON "audit_logs" USING btree ("tenant_id");

