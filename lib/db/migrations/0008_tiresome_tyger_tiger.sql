CREATE TABLE "ai_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"patient_id" uuid,
	"type" text NOT NULL,
	"input" jsonb,
	"output" jsonb
);
--> statement-breakpoint
CREATE TABLE "guardian_patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_id" uuid,
	"patient_id" uuid,
	"can_view_records" boolean DEFAULT true,
	"can_schedule" boolean DEFAULT true,
	"emergency_contact" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"relationship" text
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"is_used" boolean DEFAULT false,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"requested_by" uuid,
	"status" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"approved_by" uuid,
	"approval_notes" text,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "scheduled_purge_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_patients" ADD CONSTRAINT "guardian_patients_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_patients" ADD CONSTRAINT "guardian_patients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otps" ADD CONSTRAINT "otps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_log_patient_idx" ON "ai_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "ai_log_tenant_idx" ON "ai_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "guardian_patient_guardian_idx" ON "guardian_patients" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "guardian_patient_patient_idx" ON "guardian_patients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "guardian_user_idx" ON "guardians" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardian_tenant_idx" ON "guardians" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "otp_user_idx" ON "otps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_tenant_idx" ON "otps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "otp_type_idx" ON "otps" USING btree ("type");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tenant_idx" ON "password_resets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "password_reset_status_idx" ON "password_resets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_settings_tenant_idx" ON "tenant_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_tenant_idx" ON "notifications" USING btree ("tenant_id");