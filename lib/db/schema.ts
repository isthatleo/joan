import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";

export const baseColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
};

// Tenancy
export const tenants = pgTable("tenants", {
  ...baseColumns,
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  plan: text("plan").notNull(),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
}, (table) => ({
  tenantSlugIdx: index("tenant_slug_idx").on(table.slug),
}));

export const branches = pgTable("branches", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  address: text("address"),
});

export const departments = pgTable("departments", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: text("name"),
});

// Users + RBAC
export const users = pgTable("users", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  fullName: text("full_name"),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  bio: text("bio"),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
}, (table) => ({
  userEmailIdx: index("user_email_idx").on(table.email),
}));

export const userSettings = pgTable("user_settings", {
  ...baseColumns,
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  settings: jsonb("settings").notNull(),
}, (table) => ({
  userSettingsUserIdx: index("user_settings_user_idx").on(table.userId),
}));

export const roles = pgTable("roles", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  name: text("name").notNull(),
});

export const permissions = pgTable("permissions", {
  ...baseColumns,
  key: text("key").unique().notNull(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id").references(() => roles.id),
  permissionId: uuid("permission_id").references(() => permissions.id),
  scope: text("scope").default("tenant"),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").references(() => users.id),
  roleId: uuid("role_id").references(() => roles.id),
});

export const userOverrides = pgTable("user_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  permissionId: uuid("permission_id").references(() => permissions.id),
  allowed: boolean("allowed"),
});

// Patients
export const patients = pgTable("patients", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  globalPatientId: text("global_patient_id").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dob: timestamp("dob"),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
}, (table) => ({
  patientTenantIdx: index("patient_tenant_idx").on(table.tenantId),
}));

export const patientAllergies = pgTable("patient_allergies", {
  ...baseColumns,
  patientId: uuid("patient_id").references(() => patients.id),
  allergy: text("allergy"),
});

export const patientConditions = pgTable("patient_conditions", {
  ...baseColumns,
  patientId: uuid("patient_id").references(() => patients.id),
  condition: text("condition"),
});

// Appointments + Queue
export const appointments = pgTable("appointments", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  doctorId: uuid("doctor_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status"),
}, (table) => ({
  appointmentPatientIdx: index("appointment_patient_idx").on(table.patientId),
}));

export const queues = pgTable("queues", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  departmentId: uuid("department_id").references(() => departments.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  queueNumber: text("queue_number"),
  status: text("status"),
  priority: text("priority"),
  position: integer("position"),
  calledAt: timestamp("called_at"),
  completedAt: timestamp("completed_at"),
});

// Visits
export const visits = pgTable("visits", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  doctorId: uuid("doctor_id").references(() => users.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  reason: text("reason"),
  notes: text("notes"),
}, (table) => ({
  visitPatientIdx: index("visit_patient_idx").on(table.patientId),
}));

// Medical Records
export const diagnoses = pgTable("diagnoses", {
  ...baseColumns,
  visitId: uuid("visit_id").references(() => visits.id),
  code: text("code"),
  description: text("description"),
});

export const vitals = pgTable("vitals", {
  ...baseColumns,
  visitId: uuid("visit_id").references(() => visits.id),
  temperature: text("temperature"),
  bloodPressure: text("blood_pressure"),
  heartRate: text("heart_rate"),
});

// Prescriptions + Pharmacy
export const prescriptions = pgTable("prescriptions", {
  ...baseColumns,
  visitId: uuid("visit_id").references(() => visits.id),
  doctorId: uuid("doctor_id").references(() => users.id),
});

export const prescriptionItems = pgTable("prescription_items", {
  ...baseColumns,
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id),
  drugName: text("drug_name"),
  dosage: text("dosage"),
  duration: text("duration"),
});

export const inventoryItems = pgTable("inventory_items", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  name: text("name"),
  stock: text("stock"),
  expiryDate: timestamp("expiry_date"),
});

// Lab
export const labOrders = pgTable("lab_orders", {
  ...baseColumns,
  visitId: uuid("visit_id").references(() => visits.id),
  orderedBy: uuid("ordered_by").references(() => users.id),
  status: text("status"),
});

export const labResults = pgTable("lab_results", {
  ...baseColumns,
  labOrderId: uuid("lab_order_id").references(() => labOrders.id),
  resultData: jsonb("result_data"),
  fileUrl: text("file_url"),
});

// Billing
export const invoices = pgTable("invoices", {
  ...baseColumns,
  patientId: uuid("patient_id").references(() => patients.id),
  totalAmount: text("total_amount"),
  status: text("status"),
}, (table) => ({
  invoicePatientIdx: index("invoice_patient_idx").on(table.patientId),
}));

export const invoiceItems = pgTable("invoice_items", {
  ...baseColumns,
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  description: text("description"),
  amount: text("amount"),
});

export const payments = pgTable("payments", {
  ...baseColumns,
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  method: text("method"),
  amount: text("amount"),
  status: text("status"),
});

// Insurance
export const insurancePolicies = pgTable("insurance_policies", {
  ...baseColumns,
  patientId: uuid("patient_id").references(() => patients.id),
  provider: text("provider"),
  policyNumber: text("policy_number"),
});

export const claims = pgTable("claims", {
  ...baseColumns,
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  status: text("status"),
});

// Notifications
export const notifications = pgTable("notifications", {
  ...baseColumns,
  userId: uuid("user_id").references(() => users.id),
  type: text("type"),
  title: text("title"),
  message: text("message"),
  metadata: jsonb("metadata"),
  read: boolean("read").default(false),
});

// Audit
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  action: text("action"),
  entity: text("entity"),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  auditUserIdx: index("audit_user_idx").on(table.userId),
}));

// Events
export const events = pgTable("events", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  type: text("type"),
  payload: jsonb("payload"),
}, (table) => ({
  eventTenantIdx: index("event_tenant_idx").on(table.tenantId),
}));

// AI Logs
export const aiLogs = pgTable("ai_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  type: text("type"),
  input: jsonb("input"),
  output: jsonb("output"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guardians
export const guardians = pgTable("guardians", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id").references(() => users.id),
  relationship: text("relationship"),
});

export const guardianPatients = pgTable("guardian_patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianId: uuid("guardian_id").references(() => guardians.id),
  patientId: uuid("patient_id").references(() => patients.id),
  isPrimary: boolean("is_primary").default(false),
});

export const guardianConsents = pgTable("guardian_consents", {
  ...baseColumns,
  guardianId: uuid("guardian_id").references(() => guardians.id),
  patientId: uuid("patient_id").references(() => patients.id),
  canView: boolean("can_view").default(true),
  canEdit: boolean("can_edit").default(false),
  canMessage: boolean("can_message").default(true),
});

// Messages
export const messages = pgTable("messages", {
  ...baseColumns,
  senderId: uuid("sender_id").references(() => users.id),
  receiverId: uuid("receiver_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  message: text("message"),
});

// Indexes
// export const tenantIndex = index("tenant_name_idx").on(tenants.name);
// export const userEmailIndex = index("user_email_idx").on(users.email);
// export const patientTenantIndex = index("patient_tenant_idx").on(patients.tenantId);
// export const appointmentPatientIndex = index("appointment_patient_idx").on(appointments.patientId);
// export const visitPatientIndex = index("visit_patient_idx").on(visits.patientId);
// export const invoicePatientIndex = index("invoice_patient_idx").on(invoices.patientId);
// export const auditUserIndex = index("audit_user_idx").on(auditLogs.userId);
// export const eventTenantIndex = index("event_tenant_idx").on(events.tenantId);
