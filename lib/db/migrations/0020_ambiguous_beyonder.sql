CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"device_fingerprint_id" uuid,
	"user_session_id" uuid,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" uuid,
	"description" text,
	"status" text DEFAULT 'success',
	"error_message" text,
	"ip_address" text,
	"user_agent" text,
	"browser" text,
	"os" text,
	"device_type" text,
	"previous_data" jsonb,
	"new_data" jsonb,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "device_fingerprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"fingerprint" text NOT NULL,
	"user_agent" text,
	"browser" text,
	"browser_version" text,
	"os" text,
	"os_version" text,
	"device_type" text,
	"ip_address" text,
	"country" text,
	"city" text,
	"timezone" text,
	"screen_resolution" text,
	"language" text,
	"is_vpn" boolean DEFAULT false,
	"is_proxy" boolean DEFAULT false,
	"is_bot_or_spider" boolean DEFAULT false,
	"last_seen_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "messaging_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"allow_all_staff_messaging" boolean DEFAULT false NOT NULL,
	"allow_patient_messaging" boolean DEFAULT false NOT NULL,
	"allow_guardian_messaging" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"device_fingerprint_id" uuid,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'medium',
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"device_fingerprint_id" uuid,
	"session_token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"is_active" boolean DEFAULT true,
	"last_activity_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"logout_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_device_fingerprint_id_device_fingerprints_id_fk" FOREIGN KEY ("device_fingerprint_id") REFERENCES "public"."device_fingerprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_session_id_user_sessions_id_fk" FOREIGN KEY ("user_session_id") REFERENCES "public"."user_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_settings" ADD CONSTRAINT "messaging_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_device_fingerprint_id_device_fingerprints_id_fk" FOREIGN KEY ("device_fingerprint_id") REFERENCES "public"."device_fingerprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_device_fingerprint_id_device_fingerprints_id_fk" FOREIGN KEY ("device_fingerprint_id") REFERENCES "public"."device_fingerprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_tenant_idx" ON "activity_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activity_log_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "device_fingerprint_tenant_idx" ON "device_fingerprints" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "device_fingerprint_user_idx" ON "device_fingerprints" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_fingerprint_value_idx" ON "device_fingerprints" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_settings_tenant_idx" ON "messaging_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "security_event_tenant_idx" ON "security_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "security_event_user_idx" ON "security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_event_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "user_session_tenant_idx" ON "user_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_session_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_session_token_idx" ON "user_sessions" USING btree ("session_token");