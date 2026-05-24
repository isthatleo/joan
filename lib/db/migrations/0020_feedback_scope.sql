ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'tenant';

CREATE INDEX IF NOT EXISTS feedback_scope_idx ON feedbacks(scope);

UPDATE feedbacks
SET scope = CASE
  WHEN lower(type) IN ('bug', 'feature_request', 'feature_improvement', 'improvement', 'feature_addition')
    THEN 'platform'
  ELSE 'tenant'
END
WHERE scope IS NULL OR scope = '' OR scope = 'tenant';
