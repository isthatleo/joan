/**
 * Audit logging utility for hospital system
 * Logs all important actions to the audit_logs table
 */

interface AuditLogInput {
  tenantId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event to the system
 * @param data Audit log information
 */
export async function logAuditEvent(data: AuditLogInput): Promise<void> {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: data.tenantId,
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata || {},
      }),
    });
  } catch (error) {
    console.error("[audit] Failed to log event:", error);
    // Don't throw - audit failures shouldn't break the main operation
  }
}

/**
 * Get a user-friendly action description
 */
export function getAuditActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    // User actions
    user_created: "Created user account",
    user_updated: "Updated user account",
    user_deleted: "Deleted user account",
    user_password_changed: "Changed password",
    user_role_changed: "Changed user role",
    user_permissions_updated: "Updated user permissions",

    // Patient actions
    patient_created: "Created patient record",
    patient_updated: "Updated patient record",
    patient_deleted: "Deleted patient record",
    patient_discharged: "Discharged patient",

    // Hospital settings
    hospital_settings_updated: "Updated hospital settings",
    branding_updated: "Updated hospital branding",
    contact_info_updated: "Updated contact information",
    security_settings_updated: "Updated security settings",
    compliance_settings_updated: "Updated compliance settings",
    modules_enabled: "Enabled module",
    modules_disabled: "Disabled module",

    // Integration actions
    integration_connected: "Connected integration",
    integration_disconnected: "Disconnected integration",
    integration_tested: "Tested integration",
    integration_deleted: "Deleted integration",

    // Audit & compliance
    audit_logs_exported: "Exported audit logs",
    audit_logs_viewed: "Viewed audit logs",
    report_generated: "Generated report",
    report_exported: "Exported report",

    // Authentication
    login_successful: "Successful login",
    login_failed: "Failed login attempt",
    logout: "Logged out",
    mfa_enabled: "Enabled two-factor authentication",
    mfa_disabled: "Disabled two-factor authentication",

    // Data operations
    data_exported: "Exported data",
    data_imported: "Imported data",
    backup_created: "Created backup",
    backup_restored: "Restored backup",

    // Billing
    invoice_created: "Created invoice",
    invoice_updated: "Updated invoice",
    invoice_paid: "Marked invoice as paid",
    payment_recorded: "Recorded payment",

    // System
    system_maintenance_started: "Started maintenance mode",
    system_maintenance_ended: "Ended maintenance mode",
  };

  return descriptions[action] || action.replace(/_/g, " ");
}

/**
 * Get severity level for an action
 */
export function getAuditSeverity(action: string): "low" | "medium" | "high" {
  const criticalActions = /delete|remove|disable|security|password|role|permission|integration/i;
  const mediumActions = /update|create|export|change/i;

  if (criticalActions.test(action)) return "high";
  if (mediumActions.test(action)) return "medium";
  return "low";
}

