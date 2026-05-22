CREATE TABLE "doctor_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"doctor_id" uuid NOT NULL,
	"display_name" text,
	"title" text DEFAULT 'Dr.',
	"specialty" text,
	"license_number" text,
	"phone" text,
	"email" text,
	"bio" text,
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT true,
	"appointment_reminders" boolean DEFAULT true,
	"lab_result_alerts" boolean DEFAULT true,
	"prescription_alerts" boolean DEFAULT true,
	"system_updates" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"session_timeout" integer DEFAULT 30,
	"password_last_changed" text,
	"theme" text DEFAULT 'system',
	"language" text DEFAULT 'en',
	"timezone" text DEFAULT 'UTC',
	"date_format" text DEFAULT 'MM/dd/yyyy',
	"time_format" text DEFAULT '12h',
	"default_appointment_duration" integer DEFAULT 30,
	"working_hours" jsonb,
	"default_view" text DEFAULT 'dashboard',
	"items_per_page" integer DEFAULT 10,
	"auto_refresh" boolean DEFAULT true,
	"refresh_interval" integer DEFAULT 30,
	CONSTRAINT "doctor_settings_doctor_id_unique" UNIQUE("doctor_id")
);
--> statement-breakpoint
CREATE TABLE "lab_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"patient_id" uuid,
	"order_date" timestamp DEFAULT now(),
	"status" text DEFAULT 'pending',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"lab_order_id" uuid,
	"result_date" timestamp DEFAULT now(),
	"result" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"invoice_id" uuid,
	"patient_id" uuid,
	"amount" integer NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'pending',
	"transaction_id" text,
	"payment_date" timestamp DEFAULT now(),
	"notes" text,
	"processed_by" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "tenant_settings" (
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
DROP TABLE "activity_logs" CASCADE;--> statement-breakpoint
DROP TABLE "device_fingerprints" CASCADE;--> statement-breakpoint
DROP TABLE "notifications" CASCADE;--> statement-breakpoint
DROP TABLE "otps" CASCADE;--> statement-breakpoint
DROP TABLE "password_resets" CASCADE;--> statement-breakpoint
DROP TABLE "provisioning_runs" CASCADE;--> statement-breakpoint
DROP TABLE "security_events" CASCADE;--> statement-breakpoint
DROP TABLE "system_alerts" CASCADE;--> statement-breakpoint
DROP TABLE "system_configurations" CASCADE;--> statement-breakpoint
DROP TABLE "user_sessions" CASCADE;--> statement-breakpoint
ALTER TABLE "doctor_settings" ADD CONSTRAINT "doctor_settings_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_lab_order_id_lab_orders_id_fk" FOREIGN KEY ("lab_order_id") REFERENCES "public"."lab_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doctor_settings_doctor_idx" ON "doctor_settings" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "lab_order_tenant_idx" ON "lab_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lab_order_patient_idx" ON "lab_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "lab_order_status_idx" ON "lab_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lab_result_lab_order_idx" ON "lab_results" USING btree ("lab_order_id");--> statement-breakpoint
CREATE INDEX "payment_tenant_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_patient_idx" ON "payments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_method_idx" ON "payments" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "tenant_settings_tenant_idx" ON "tenant_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_settings_key_idx" ON "tenant_settings" USING btree ("key");