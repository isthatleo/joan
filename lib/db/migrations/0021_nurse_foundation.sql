ALTER TABLE vitals
  ADD COLUMN IF NOT EXISTS respiratory_rate text,
  ADD COLUMN IF NOT EXISTS oxygen_saturation text,
  ADD COLUMN IF NOT EXISTS pain_score integer,
  ADD COLUMN IF NOT EXISTS recorded_by uuid,
  ADD COLUMN IF NOT EXISTS recorded_at timestamp DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'medication_administrations'
  ) THEN
    CREATE TABLE medication_administrations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now(),
      deleted_at timestamp,
      tenant_id uuid,
      prescription_id uuid,
      prescription_item_id uuid,
      patient_id uuid,
      scheduled_at timestamp,
      administered_at timestamp,
      administered_by uuid,
      status text NOT NULL DEFAULT 'pending',
      notes text
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS med_admin_tenant_idx ON medication_administrations(tenant_id);
CREATE INDEX IF NOT EXISTS med_admin_patient_idx ON medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS med_admin_prescription_idx ON medication_administrations(prescription_id);
CREATE INDEX IF NOT EXISTS med_admin_status_idx ON medication_administrations(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'bed_assignments'
  ) THEN
    CREATE TABLE bed_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now(),
      deleted_at timestamp,
      tenant_id uuid,
      patient_id uuid,
      bed_number text NOT NULL,
      ward text NOT NULL,
      room text,
      status text NOT NULL DEFAULT 'available',
      assigned_nurse_id uuid,
      admission_date timestamp,
      discharge_date timestamp,
      condition text,
      notes text
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bed_assignment_tenant_idx ON bed_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS bed_assignment_patient_idx ON bed_assignments(patient_id);
CREATE INDEX IF NOT EXISTS bed_assignment_status_idx ON bed_assignments(status);
CREATE INDEX IF NOT EXISTS bed_assignment_bed_idx ON bed_assignments(bed_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'care_plans'
  ) THEN
    CREATE TABLE care_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now(),
      deleted_at timestamp,
      tenant_id uuid,
      patient_id uuid,
      created_by uuid,
      assigned_nurse_id uuid,
      title text NOT NULL,
      diagnosis text,
      goals text,
      interventions text,
      status text NOT NULL DEFAULT 'active',
      priority text NOT NULL DEFAULT 'routine',
      start_date timestamp,
      target_date timestamp,
      completed_at timestamp,
      notes text
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS care_plan_tenant_idx ON care_plans(tenant_id);
CREATE INDEX IF NOT EXISTS care_plan_patient_idx ON care_plans(patient_id);
CREATE INDEX IF NOT EXISTS care_plan_nurse_idx ON care_plans(assigned_nurse_id);
CREATE INDEX IF NOT EXISTS care_plan_status_idx ON care_plans(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'care_plan_tasks'
  ) THEN
    CREATE TABLE care_plan_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now(),
      deleted_at timestamp,
      care_plan_id uuid,
      assigned_to uuid,
      title text NOT NULL,
      description text,
      due_at timestamp,
      completed_at timestamp,
      status text NOT NULL DEFAULT 'pending',
      notes text
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS care_plan_task_plan_idx ON care_plan_tasks(care_plan_id);
CREATE INDEX IF NOT EXISTS care_plan_task_status_idx ON care_plan_tasks(status);
