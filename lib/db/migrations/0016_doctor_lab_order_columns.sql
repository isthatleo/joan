ALTER TABLE lab_orders
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES patients(id),
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS test_name text,
  ADD COLUMN IF NOT EXISTS test_code text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS ordered_at timestamp,
  ADD COLUMN IF NOT EXISTS collected_at timestamp,
  ADD COLUMN IF NOT EXISTS completed_at timestamp,
  ADD COLUMN IF NOT EXISTS results jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS due_date timestamp,
  ADD COLUMN IF NOT EXISTS lab_location text;
