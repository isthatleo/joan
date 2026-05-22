/**
 * Audit Logging Utility
 * Use this utility to log audit actions throughout the application
 */

export interface AuditLogPayload {
  tenantId?: string;
  userId?: string;
  action: string; // "create", "update", "delete", "view", "export", "download", "upload", "login", "logout", etc.
  entity: string; // "patient", "appointment", "prescription", "invoice", etc.
  entityId?: string;
  description?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>;
}

/**
 * Log an audit action to the database
 * This is typically called from the server-side after an action is performed
 */
export async function logAuditAction(payload: AuditLogPayload) {
  try {
    const response = await fetch("/api/audit-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to log audit action:", await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error("Error logging audit action:", error);
    return false;
  }
}

/**
 * Log an audit action from the server-side
 * This should be called within API routes
 */
export async function logServerAuditAction(
  db: any,
  auditLogsTable: any,
  payload: AuditLogPayload & { createdAt?: Date }
) {
  try {
    await db.insert(auditLogsTable).values({
      tenantId: payload.tenantId || null,
      userId: payload.userId || null,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId || null,
      description: payload.description || null,
      previousData: payload.previousData || null,
      newData: payload.newData || null,
      metadata: payload.metadata || {},
      ipAddress: payload.ipAddress || null,
      userAgent: payload.userAgent || null,
      changes: payload.changes || null,
      createdAt: payload.createdAt || new Date(),
    });

    return true;
  } catch (error) {
    console.error("Error logging server audit action:", error);
    return false;
  }
}

/**
 * Common audit action creators
 * Use these for consistent action naming
 */
export const AuditActions = {
  // User actions
  LOGIN: "login",
  LOGOUT: "logout",
  CREATE_USER: "create_user",
  UPDATE_USER: "update_user",
  DELETE_USER: "delete_user",

  // Patient actions
  CREATE_PATIENT: "create_patient",
  UPDATE_PATIENT: "update_patient",
  DELETE_PATIENT: "delete_patient",
  VIEW_PATIENT: "view_patient",
  EXPORT_PATIENT: "export_patient",

  // Appointment actions
  CREATE_APPOINTMENT: "create_appointment",
  UPDATE_APPOINTMENT: "update_appointment",
  DELETE_APPOINTMENT: "delete_appointment",
  CANCEL_APPOINTMENT: "cancel_appointment",
  VIEW_APPOINTMENT: "view_appointment",

  // Prescription actions
  CREATE_PRESCRIPTION: "create_prescription",
  UPDATE_PRESCRIPTION: "update_prescription",
  DELETE_PRESCRIPTION: "delete_prescription",
  VIEW_PRESCRIPTION: "view_prescription",
  DISPENSE_PRESCRIPTION: "dispense_prescription",

  // Lab actions
  CREATE_LAB_ORDER: "create_lab_order",
  UPDATE_LAB_ORDER: "update_lab_order",
  DELETE_LAB_ORDER: "delete_lab_order",
  UPLOAD_LAB_RESULT: "upload_lab_result",
  VIEW_LAB_RESULT: "view_lab_result",

  // Invoice actions
  CREATE_INVOICE: "create_invoice",
  UPDATE_INVOICE: "update_invoice",
  DELETE_INVOICE: "delete_invoice",
  SEND_INVOICE: "send_invoice",
  MARK_PAID: "mark_paid",

  // Message actions
  SEND_MESSAGE: "send_message",
  DELETE_MESSAGE: "delete_message",

  // Attachment actions
  UPLOAD_FILE: "upload_file",
  DELETE_FILE: "delete_file",
  DOWNLOAD_FILE: "download_file",

  // Report/Export actions
  EXPORT_RECORDS: "export_records",
  GENERATE_REPORT: "generate_report",

  // System actions
  EXPORT_DATA: "export_data",
  IMPORT_DATA: "import_data",
  CHANGE_SETTINGS: "change_settings",
  UPDATE_CONFIGURATION: "update_configuration",
};

/**
 * Common entity types
 */
export const AuditEntities = {
  USER: "user",
  PATIENT: "patient",
  APPOINTMENT: "appointment",
  PRESCRIPTION: "prescription",
  LAB_ORDER: "lab_order",
  LAB_RESULT: "lab_result",
  INVOICE: "invoice",
  PAYMENT: "payment",
  MESSAGE: "message",
  ATTACHMENT: "attachment",
  REPORT: "report",
};

/**
 * Helper to calculate changes between two objects
 */
export function calculateChanges(previous: Record<string, any>, current: Record<string, any>): Record<string, any> {
  const changes: Record<string, any> = {};

  // Find updated fields
  for (const key in current) {
    if (!(key in previous) || JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      changes[key] = {
        from: previous[key],
        to: current[key],
      };
    }
  }

  // Find deleted fields
  for (const key in previous) {
    if (!(key in current)) {
      changes[key] = {
        from: previous[key],
        to: null,
      };
    }
  }

  return changes;
}

/**
 * Mask sensitive data before logging
 */
export function maskSensitiveData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    "password",
    "passwordHash",
    "apiKey",
    "apiSecret",
    "token",
    "secret",
    "ssn",
    "creditCard",
    "bankAccount",
  ];

  const masked = { ...data };

  sensitiveFields.forEach((field) => {
    if (field in masked) {
      masked[field] = "***MASKED***";
    }
  });

  return masked;
}

