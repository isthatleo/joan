ALTER TABLE patients ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mrn text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

UPDATE patients
SET full_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
WHERE full_name IS NULL;

UPDATE patients
SET mrn = COALESCE(global_patient_id, id::text)
WHERE mrn IS NULL;

UPDATE patients
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_due text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE invoices
SET invoice_number = COALESCE(invoice_number, 'INV-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 12));

UPDATE invoices
SET amount = COALESCE(amount, total_amount)
WHERE amount IS NULL;

UPDATE invoices
SET amount_due = COALESCE(amount_due, total_amount)
WHERE amount_due IS NULL;

UPDATE invoices
SET items = '[]'::jsonb
WHERE items IS NULL;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed_at timestamp;

UPDATE payments
SET processed_at = COALESCE(processed_at, updated_at)
WHERE processed_at IS NULL
  AND status = 'completed';

UPDATE invoices i
SET amount_due = GREATEST(COALESCE(i.amount::numeric, 0) - COALESCE(paid.total_paid, 0), 0)::text
FROM (
  SELECT invoice_id, SUM(COALESCE(amount::numeric, 0)) AS total_paid
  FROM payments
  WHERE deleted_at IS NULL
    AND status = 'completed'
  GROUP BY invoice_id
) paid
WHERE i.id = paid.invoice_id;

UPDATE invoices
SET status = CASE
  WHEN COALESCE(amount_due::numeric, 0) <= 0 AND status <> 'paid' THEN 'paid'
  WHEN COALESCE(amount_due::numeric, 0) > 0 AND status = 'paid' THEN 'partial'
  ELSE COALESCE(status, 'draft')
END;
