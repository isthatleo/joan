CREATE TABLE "bed_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"patient_id" uuid,
	"bed_number" text NOT NULL,
	"ward" text NOT NULL,
	"room" text,
	"status" text DEFAULT 'available' NOT NULL,
	"assigned_nurse_id" uuid,
	"admission_date" timestamp,
	"discharge_date" timestamp,
	"condition" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "care_plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"care_plan_id" uuid,
	"assigned_to" uuid,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp,
	"completed_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "care_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"patient_id" uuid,
	"created_by" uuid,
	"assigned_nurse_id" uuid,
	"title" text NOT NULL,
	"diagnosis" text,
	"goals" text,
	"interventions" text,
	"status" text DEFAULT 'active' NOT NULL,
	"priority" text DEFAULT 'routine' NOT NULL,
	"start_date" timestamp,
	"target_date" timestamp,
	"completed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "medication_administrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"prescription_id" uuid,
	"prescription_item_id" uuid,
	"patient_id" uuid,
	"scheduled_at" timestamp,
	"administered_at" timestamp,
	"administered_by" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "respiratory_rate" text;--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "oxygen_saturation" text;--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "pain_score" integer;--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "recorded_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "vitals" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_assigned_nurse_id_users_id_fk" FOREIGN KEY ("assigned_nurse_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_tasks" ADD CONSTRAINT "care_plan_tasks_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_tasks" ADD CONSTRAINT "care_plan_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_assigned_nurse_id_users_id_fk" FOREIGN KEY ("assigned_nurse_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administered_by_users_id_fk" FOREIGN KEY ("administered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bed_assignment_tenant_idx" ON "bed_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bed_assignment_patient_idx" ON "bed_assignments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "bed_assignment_status_idx" ON "bed_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bed_assignment_bed_idx" ON "bed_assignments" USING btree ("bed_number");--> statement-breakpoint
CREATE INDEX "care_plan_task_plan_idx" ON "care_plan_tasks" USING btree ("care_plan_id");--> statement-breakpoint
CREATE INDEX "care_plan_task_status_idx" ON "care_plan_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "care_plan_tenant_idx" ON "care_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "care_plan_patient_idx" ON "care_plans" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "care_plan_nurse_idx" ON "care_plans" USING btree ("assigned_nurse_id");--> statement-breakpoint
CREATE INDEX "care_plan_status_idx" ON "care_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "med_admin_tenant_idx" ON "medication_administrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "med_admin_patient_idx" ON "medication_administrations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "med_admin_prescription_idx" ON "medication_administrations" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "med_admin_status_idx" ON "medication_administrations" USING btree ("status");--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;