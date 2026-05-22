CREATE TABLE "system_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"severity" text DEFAULT 'info',
	"type" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "system_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"cpu_usage" integer,
	"memory_usage" integer,
	"disk_usage" integer,
	"network_io" integer,
	"database_size" text,
	"active_users" integer,
	"api_response_time" integer,
	"uptime" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_configurations" ADD CONSTRAINT "system_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_alerts_tenant_idx" ON "system_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_alerts_severity_idx" ON "system_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "system_config_tenant_idx" ON "system_configurations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_config_key_idx" ON "system_configurations" USING btree ("key");--> statement-breakpoint
CREATE INDEX "system_metrics_tenant_idx" ON "system_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_tenant_idx" ON "audit_logs" USING btree ("tenant_id");