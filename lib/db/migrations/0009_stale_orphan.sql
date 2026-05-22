CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"api_key_encrypted" text,
	"api_secret_encrypted" text,
	"account_id" text,
	"account_name" text,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'pending',
	"last_tested_at" timestamp,
	"test_error" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_tenant_idx" ON "integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "integration_provider_idx" ON "integrations" USING btree ("provider");