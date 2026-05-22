-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cpu_usage INTEGER,
  memory_usage INTEGER,
  disk_usage INTEGER,
  network_io INTEGER,
  database_size TEXT,
  active_users INTEGER,
  api_response_time INTEGER,
  uptime TEXT,
  "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create system alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'info',
  type TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create system configurations table
CREATE TABLE IF NOT EXISTS system_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS system_metrics_tenant_idx ON system_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS system_metrics_timestamp_idx ON system_metrics("timestamp");
CREATE INDEX IF NOT EXISTS system_alerts_tenant_idx ON system_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS system_alerts_severity_idx ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS system_config_tenant_idx ON system_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS system_config_key_idx ON system_configurations(key);

