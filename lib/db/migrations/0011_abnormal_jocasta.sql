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
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
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
ALTER TABLE "broadcast_recipients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "broadcasts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation_participants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dispensing_records" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "doctor_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drug_interactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "medications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pharmacy_analytics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pharmacy_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quality_control_records" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stock_alerts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "suppliers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "broadcast_recipients" CASCADE;--> statement-breakpoint
DROP TABLE "broadcasts" CASCADE;--> statement-breakpoint
DROP TABLE "conversation_participants" CASCADE;--> statement-breakpoint
DROP TABLE "conversations" CASCADE;--> statement-breakpoint
DROP TABLE "dispensing_records" CASCADE;--> statement-breakpoint
DROP TABLE "doctor_settings" CASCADE;--> statement-breakpoint
DROP TABLE "drug_interactions" CASCADE;--> statement-breakpoint
DROP TABLE "feedback" CASCADE;--> statement-breakpoint
DROP TABLE "medications" CASCADE;--> statement-breakpoint
DROP TABLE "pharmacy_analytics" CASCADE;--> statement-breakpoint
DROP TABLE "pharmacy_settings" CASCADE;--> statement-breakpoint
DROP TABLE "quality_control_records" CASCADE;--> statement-breakpoint
DROP TABLE "stock_alerts" CASCADE;--> statement-breakpoint
DROP TABLE "suppliers" CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_medication_id_medications_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_supplier_id_suppliers_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "lab_orders" DROP CONSTRAINT "lab_orders_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_processed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_medication_id_medications_id_fk";
--> statement-breakpoint
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_patient_id_patients_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_settings" DROP CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk";
--> statement-breakpoint
DROP INDEX "audit_log_tenant_idx";--> statement-breakpoint
DROP INDEX "audit_log_user_idx";--> statement-breakpoint
DROP INDEX "audit_log_action_idx";--> statement-breakpoint
DROP INDEX "audit_log_entity_idx";--> statement-breakpoint
DROP INDEX "audit_log_created_idx";--> statement-breakpoint
DROP INDEX "inventory_tenant_idx";--> statement-breakpoint
DROP INDEX "inventory_medication_idx";--> statement-breakpoint
DROP INDEX "inventory_expiry_idx";--> statement-breakpoint
DROP INDEX "inventory_status_idx";--> statement-breakpoint
DROP INDEX "lab_order_tenant_idx";--> statement-breakpoint
DROP INDEX "lab_order_patient_idx";--> statement-breakpoint
DROP INDEX "lab_order_status_idx";--> statement-breakpoint
DROP INDEX "lab_result_lab_order_idx";--> statement-breakpoint
DROP INDEX "message_conv_idx";--> statement-breakpoint
DROP INDEX "notifications_tenant_idx";--> statement-breakpoint
DROP INDEX "notifications_user_idx";--> statement-breakpoint
DROP INDEX "otps_tenant_idx";--> statement-breakpoint
DROP INDEX "otps_user_idx";--> statement-breakpoint
DROP INDEX "otps_code_idx";--> statement-breakpoint
DROP INDEX "password_resets_tenant_idx";--> statement-breakpoint
DROP INDEX "password_resets_user_idx";--> statement-breakpoint
DROP INDEX "password_resets_token_idx";--> statement-breakpoint
DROP INDEX "payment_tenant_idx";--> statement-breakpoint
DROP INDEX "payment_invoice_idx";--> statement-breakpoint
DROP INDEX "payment_patient_idx";--> statement-breakpoint
DROP INDEX "payment_status_idx";--> statement-breakpoint
DROP INDEX "payment_method_idx";--> statement-breakpoint
DROP INDEX "prescription_item_prescription_idx";--> statement-breakpoint
DROP INDEX "prescription_item_medication_idx";--> statement-breakpoint
DROP INDEX "prescription_item_status_idx";--> statement-breakpoint
DROP INDEX "prescription_tenant_idx";--> statement-breakpoint
DROP INDEX "prescription_patient_idx";--> statement-breakpoint
DROP INDEX "prescription_doctor_idx";--> statement-breakpoint
DROP INDEX "prescription_status_idx";--> statement-breakpoint
DROP INDEX "provisioning_runs_tenant_idx";--> statement-breakpoint
DROP INDEX "tenant_settings_key_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "action" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "password_resets" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "prescription_items" ALTER COLUMN "dosage" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prescription_items" ALTER COLUMN "duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "provisioning_runs" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "stock" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "visit_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "ordered_by" uuid;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "result_data" jsonb;--> statement-breakpoint
ALTER TABLE "lab_results" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "receiver_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "type" text DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "max_attempts" integer DEFAULT 3;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "is_used" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "otps" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "requested_by" uuid;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "status" text NOT NULL;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "password_resets" ADD COLUMN "approval_notes" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "method" text;--> statement-breakpoint
ALTER TABLE "provisioning_runs" ADD COLUMN "stage" text;--> statement-breakpoint
ALTER TABLE "provisioning_runs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_patients" ADD CONSTRAINT "guardian_patients_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_patients" ADD CONSTRAINT "guardian_patients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_configurations" ADD CONSTRAINT "system_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_log_patient_idx" ON "ai_logs" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "ai_log_tenant_idx" ON "ai_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "guardian_patient_guardian_idx" ON "guardian_patients" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "guardian_patient_patient_idx" ON "guardian_patients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "guardian_user_idx" ON "guardians" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardian_tenant_idx" ON "guardians" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "integration_tenant_idx" ON "integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "integration_provider_idx" ON "integrations" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "system_alerts_tenant_idx" ON "system_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_alerts_severity_idx" ON "system_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "system_config_tenant_idx" ON "system_configurations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_config_key_idx" ON "system_configurations" USING btree ("key");--> statement-breakpoint
CREATE INDEX "system_metrics_tenant_idx" ON "system_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics" USING btree ("timestamp");--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "message_receiver_idx" ON "messages" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_tenant_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "otp_user_idx" ON "otps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_tenant_idx" ON "otps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "otp_type_idx" ON "otps" USING btree ("type");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tenant_idx" ON "password_resets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "password_reset_status_idx" ON "password_resets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "provisioning_tenant_idx" ON "provisioning_runs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "provisioning_status_idx" ON "provisioning_runs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "previous_data";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "new_data";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "ip_address";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "user_agent";--> statement-breakpoint
ALTER TABLE "audit_logs" DROP COLUMN "changes";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "medication_id";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "batch_number";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "manufacturer";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "min_stock_level";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "max_stock_level";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "unit_price";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "selling_price";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "supplier_id";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "barcode";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "lab_orders" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "lab_orders" DROP COLUMN "order_date";--> statement-breakpoint
ALTER TABLE "lab_orders" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "lab_results" DROP COLUMN "result_date";--> statement-breakpoint
ALTER TABLE "lab_results" DROP COLUMN "result";--> statement-breakpoint
ALTER TABLE "lab_results" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "conversation_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "message_type";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "file_url";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "file_size";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "read_by";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "body";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "read_at";--> statement-breakpoint
ALTER TABLE "otps" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "otps" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "otps" DROP COLUMN "purpose";--> statement-breakpoint
ALTER TABLE "otps" DROP COLUMN "consumed_at";--> statement-breakpoint
ALTER TABLE "password_resets" DROP COLUMN "consumed_at";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "transaction_id";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "payment_date";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "processed_by";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "medication_id";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "generic_name";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "frequency";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "instructions";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "refills";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "refills_remaining";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "dispensed_quantity";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "last_dispensed_at";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "is_prn";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "route";--> statement-breakpoint
ALTER TABLE "prescription_items" DROP COLUMN "strength";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "patient_id";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "diagnosis";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "prescribed_at";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "valid_until";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "is_emergency";--> statement-breakpoint
ALTER TABLE "prescriptions" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "provisioning_runs" DROP COLUMN "step";--> statement-breakpoint
ALTER TABLE "provisioning_runs" DROP COLUMN "error";--> statement-breakpoint
ALTER TABLE "tenant_settings" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "tenant_settings" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "tenant_settings" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_seen_at";