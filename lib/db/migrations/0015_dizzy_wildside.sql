ALTER TABLE "invoices" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "amount" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "amount_due" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "items" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "doctor_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "test_name" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "test_code" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "ordered_at" timestamp;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "collected_at" timestamp;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "results" jsonb;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN "lab_location" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "mrn" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "transaction_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "fee" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_amount" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "medication_id" uuid;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "generic_name" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "strength" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "frequency" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "quantity" integer;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "refills" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "is_prn" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD COLUMN "route" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "medication" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "generic_name" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "strength" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "dosage" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "frequency" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "duration" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "quantity" integer;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "refills" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "refills_remaining" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "indications" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "prescribed_by" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "prescribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "filled_at" timestamp;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "pharmacy" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "interactions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "side_effects" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "diagnosis" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "is_emergency" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;