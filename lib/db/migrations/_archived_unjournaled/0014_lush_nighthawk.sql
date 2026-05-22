CREATE TABLE "dispensing_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"prescription_id" uuid,
	"prescription_item_id" uuid,
	"inventory_item_id" uuid,
	"pharmacist_id" uuid,
	"quantity" integer NOT NULL,
	"instructions" text,
	"dispensed_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'dispensed'
);
--> statement-breakpoint
CREATE TABLE "drug_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"medication_a_id" uuid,
	"medication_b_id" uuid,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"clinical_effects" text,
	"management" text,
	"evidence_level" text
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"name" text NOT NULL,
	"generic_name" text,
	"category" text,
	"dosage" text,
	"description" text,
	"manufacturer" text,
	"unit_price" integer,
	"selling_price" integer,
	"requires_prescription" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"side_effects" jsonb,
	"interactions" jsonb,
	"storage_conditions" text
);
--> statement-breakpoint
CREATE TABLE "pharmacy_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"date" timestamp NOT NULL,
	"total_prescriptions" integer DEFAULT 0,
	"dispensed_prescriptions" integer DEFAULT 0,
	"total_revenue" integer DEFAULT 0,
	"medication_revenue" integer DEFAULT 0,
	"inventory_value" integer DEFAULT 0,
	"low_stock_alerts" integer DEFAULT 0,
	"expired_items" integer DEFAULT 0,
	"drug_interactions_detected" integer DEFAULT 0,
	"average_dispensing_time" integer
);
--> statement-breakpoint
CREATE TABLE "pharmacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "quality_control_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"inventory_item_id" uuid,
	"test_type" text NOT NULL,
	"result" text NOT NULL,
	"tested_by" uuid,
	"tested_at" timestamp DEFAULT now(),
	"expiry_date" timestamp,
	"notes" text,
	"attachments" jsonb
);
--> statement-breakpoint
CREATE TABLE "stock_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"inventory_item_id" uuid,
	"alert_type" text NOT NULL,
	"message" text NOT NULL,
	"threshold" integer,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"country" text,
	"payment_terms" text,
	"is_active" boolean DEFAULT true,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "lab_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lab_results" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "lab_orders" CASCADE;--> statement-breakpoint
DROP TABLE "lab_results" CASCADE;--> statement-breakpoint
DROP TABLE "payments" CASCADE;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "medication_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "batch_number" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "manufacturer" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "quantity" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "min_stock_level" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "max_stock_level" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "unit_price" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "selling_price" integer;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "barcode" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "dispensing_records" ADD CONSTRAINT "dispensing_records_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_records" ADD CONSTRAINT "dispensing_records_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_records" ADD CONSTRAINT "dispensing_records_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensing_records" ADD CONSTRAINT "dispensing_records_pharmacist_id_users_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_medication_a_id_medications_id_fk" FOREIGN KEY ("medication_a_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_medication_b_id_medications_id_fk" FOREIGN KEY ("medication_b_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_control_records" ADD CONSTRAINT "quality_control_records_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_control_records" ADD CONSTRAINT "quality_control_records_tested_by_users_id_fk" FOREIGN KEY ("tested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispensing_tenant_idx" ON "dispensing_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dispensing_prescription_idx" ON "dispensing_records" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "dispensing_inventory_idx" ON "dispensing_records" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "drug_interaction_tenant_idx" ON "drug_interactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "drug_interaction_med_a_idx" ON "drug_interactions" USING btree ("medication_a_id");--> statement-breakpoint
CREATE INDEX "drug_interaction_med_b_idx" ON "drug_interactions" USING btree ("medication_b_id");--> statement-breakpoint
CREATE INDEX "medication_tenant_idx" ON "medications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "medication_name_idx" ON "medications" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pharmacy_analytics_tenant_idx" ON "pharmacy_analytics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pharmacy_analytics_date_idx" ON "pharmacy_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "pharmacy_settings_tenant_idx" ON "pharmacy_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pharmacy_settings_key_idx" ON "pharmacy_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "qc_tenant_idx" ON "quality_control_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "qc_inventory_idx" ON "quality_control_records" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "qc_test_type_idx" ON "quality_control_records" USING btree ("test_type");--> statement-breakpoint
CREATE INDEX "stock_alert_tenant_idx" ON "stock_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_alert_inventory_idx" ON "stock_alerts" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "stock_alert_type_idx" ON "stock_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "supplier_tenant_idx" ON "suppliers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "supplier_name_idx" ON "suppliers" USING btree ("name");--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_tenant_idx" ON "inventory_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "inventory_medication_idx" ON "inventory_items" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "inventory_expiry_idx" ON "inventory_items" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "inventory_status_idx" ON "inventory_items" USING btree ("status");--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "stock";