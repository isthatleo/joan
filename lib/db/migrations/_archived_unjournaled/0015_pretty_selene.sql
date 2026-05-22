CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"read" boolean DEFAULT false,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "guardian_patients" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guardians" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integrations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "system_metrics" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "guardian_patients" CASCADE;--> statement-breakpoint
DROP TABLE "guardians" CASCADE;--> statement-breakpoint
DROP TABLE "integrations" CASCADE;--> statement-breakpoint
DROP TABLE "platform_settings" CASCADE;--> statement-breakpoint
DROP TABLE "system_metrics" CASCADE;--> statement-breakpoint
DROP TABLE "tenant_settings" CASCADE;--> statement-breakpoint
ALTER TABLE "prescription_items" ALTER COLUMN "dosage" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prescription_items" ALTER COLUMN "duration" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "medication_id" uuid;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "generic_name" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "frequency" text NOT NULL;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "quantity" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "refills" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "refills_remaining" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "dispensed_quantity" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "last_dispensed_at" timestamp;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "is_prn" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "route" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "strength" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "diagnosis" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "prescribed_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "is_emergency" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "priority" text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_tenant_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notification_read_idx" ON "notifications" USING btree ("read");--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prescription_item_prescription_idx" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "prescription_item_medication_idx" ON "prescription_items" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "prescription_item_status_idx" ON "prescription_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prescription_tenant_idx" ON "prescriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prescription_patient_idx" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "prescription_doctor_idx" ON "prescriptions" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "prescription_status_idx" ON "prescriptions" USING btree ("status");