import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, index, numeric, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  timezone: text("timezone").default("UTC"),
  logoUrl: text("logo_url"),
  adminUserId: uuid("admin_user_id"),
  provisioningStatus: text("provisioning_status").default("pending"),
  provisionedAt: timestamp("provisioned_at"),
  scheduledPurgeAt: timestamp("scheduled_purge_at"),
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
  role: text("role").default("patient"),
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

export const doctorSettings = pgTable("doctor_settings", {
  ...baseColumns,
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  settings: jsonb("settings").notNull(),
}, (table) => ({
  doctorSettingsUserIdx: index("doctor_settings_user_idx").on(table.userId),
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
  fullName: text("full_name"),
  mrn: text("mrn"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dob: timestamp("dob"),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  status: text("status").default("active"),
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
  respiratoryRate: text("respiratory_rate"),
  oxygenSaturation: text("oxygen_saturation"),
  painScore: integer("pain_score"),
  recordedBy: uuid("recorded_by").references(() => users.id),
  recordedAt: timestamp("recorded_at").defaultNow(),
  notes: text("notes"),
});

// Prescriptions + Pharmacy
export const prescriptions = pgTable("prescriptions", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  visitId: uuid("visit_id").references(() => visits.id),
  doctorId: uuid("doctor_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  medication: text("medication"),
  genericName: text("generic_name"),
  strength: text("strength"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  duration: text("duration"),
  quantity: integer("quantity"),
  refills: integer("refills").default(0),
  refillsRemaining: integer("refills_remaining").default(0),
  instructions: text("instructions"),
  indications: text("indications"),
  status: text("status"),
  prescribedBy: text("prescribed_by"),
  prescribedAt: timestamp("prescribed_at"),
  filledAt: timestamp("filled_at"),
  expiresAt: timestamp("expires_at"),
  pharmacy: text("pharmacy"),
  notes: text("notes"),
  interactions: jsonb("interactions").default([]),
  sideEffects: jsonb("side_effects").default([]),
  diagnosis: text("diagnosis"),
  priority: text("priority"),
  isEmergency: boolean("is_emergency").default(false),
  validUntil: timestamp("valid_until"),
});

export const prescriptionItems = pgTable("prescription_items", {
  ...baseColumns,
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id),
  medicationId: uuid("medication_id"),
  drugName: text("drug_name"),
  genericName: text("generic_name"),
  strength: text("strength"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  duration: text("duration"),
  quantity: integer("quantity"),
  instructions: text("instructions"),
  refills: integer("refills").default(0),
  isPrn: boolean("is_prn").default(false),
  route: text("route"),
});

export const medicationAdministrations = pgTable("medication_administrations", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id),
  prescriptionItemId: uuid("prescription_item_id").references(() => prescriptionItems.id),
  patientId: uuid("patient_id").references(() => patients.id),
  scheduledAt: timestamp("scheduled_at"),
  administeredAt: timestamp("administered_at"),
  administeredBy: uuid("administered_by").references(() => users.id),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
}, (table) => ({
  medicationAdministrationTenantIdx: index("med_admin_tenant_idx").on(table.tenantId),
  medicationAdministrationPatientIdx: index("med_admin_patient_idx").on(table.patientId),
  medicationAdministrationPrescriptionIdx: index("med_admin_prescription_idx").on(table.prescriptionId),
  medicationAdministrationStatusIdx: index("med_admin_status_idx").on(table.status),
}));

export const bedAssignments = pgTable("bed_assignments", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  patientId: uuid("patient_id").references(() => patients.id),
  bedNumber: text("bed_number").notNull(),
  ward: text("ward").notNull(),
  room: text("room"),
  status: text("status").default("available").notNull(),
  assignedNurseId: uuid("assigned_nurse_id").references(() => users.id),
  admissionDate: timestamp("admission_date"),
  dischargeDate: timestamp("discharge_date"),
  condition: text("condition"),
  notes: text("notes"),
}, (table) => ({
  bedAssignmentTenantIdx: index("bed_assignment_tenant_idx").on(table.tenantId),
  bedAssignmentPatientIdx: index("bed_assignment_patient_idx").on(table.patientId),
  bedAssignmentStatusIdx: index("bed_assignment_status_idx").on(table.status),
  bedAssignmentBedIdx: index("bed_assignment_bed_idx").on(table.bedNumber),
}));

export const carePlans = pgTable("care_plans", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  patientId: uuid("patient_id").references(() => patients.id),
  createdBy: uuid("created_by").references(() => users.id),
  assignedNurseId: uuid("assigned_nurse_id").references(() => users.id),
  title: text("title").notNull(),
  diagnosis: text("diagnosis"),
  goals: text("goals"),
  interventions: text("interventions"),
  status: text("status").default("active").notNull(),
  priority: text("priority").default("routine").notNull(),
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
}, (table) => ({
  carePlanTenantIdx: index("care_plan_tenant_idx").on(table.tenantId),
  carePlanPatientIdx: index("care_plan_patient_idx").on(table.patientId),
  carePlanNurseIdx: index("care_plan_nurse_idx").on(table.assignedNurseId),
  carePlanStatusIdx: index("care_plan_status_idx").on(table.status),
}));

export const carePlanTasks = pgTable("care_plan_tasks", {
  ...baseColumns,
  carePlanId: uuid("care_plan_id").references(() => carePlans.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
}, (table) => ({
  carePlanTaskPlanIdx: index("care_plan_task_plan_idx").on(table.carePlanId),
  carePlanTaskStatusIdx: index("care_plan_task_status_idx").on(table.status),
}));

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
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  doctorId: uuid("doctor_id").references(() => users.id),
  visitId: uuid("visit_id").references(() => visits.id),
  testName: text("test_name"),
  testCode: text("test_code"),
  category: text("category"),
  priority: text("priority"),
  orderedBy: uuid("ordered_by").references(() => users.id),
  orderedAt: timestamp("ordered_at"),
  collectedAt: timestamp("collected_at"),
  completedAt: timestamp("completed_at"),
  results: jsonb("results"),
  notes: text("notes"),
  dueDate: timestamp("due_date"),
  labLocation: text("lab_location"),
  status: text("status"),
});

export const labResults = pgTable("lab_results", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  labOrderId: uuid("lab_order_id").references(() => labOrders.id),
  resultData: jsonb("result_data"),
  fileUrl: text("file_url"),
});

// Billing
export const invoices = pgTable("invoices", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  invoiceNumber: text("invoice_number"),
  amount: text("amount"),
  amountDue: text("amount_due"),
  totalAmount: text("total_amount"),
  status: text("status"),
  dueDate: date("due_date"),
  description: text("description"),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  items: jsonb("items").default([]),
  createdBy: uuid("created_by"),
}, (table) => ({
  invoicePatientIdx: index("invoice_patient_idx").on(table.patientId),
  invoiceTenantIdx: index("invoice_tenant_idx").on(table.tenantId),
}));

export const invoiceItems = pgTable("invoice_items", {
  ...baseColumns,
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  description: text("description"),
  amount: text("amount"),
});

export const payments = pgTable("payments", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  method: text("method"),
  amount: text("amount"),
  status: text("status"),
  transactionId: text("transaction_id"),
  notes: text("notes"),
  fee: text("fee"),
  refundAmount: text("refund_amount"),
  createdBy: uuid("created_by"),
  processedAt: timestamp("processed_at"),
});

// Insurance
export const insurancePolicies = pgTable("insurance_policies", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  provider: text("provider"),
  policyNumber: text("policy_number"),
});

export const claims = pgTable("claims", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  policyId: uuid("policy_id").references(() => insurancePolicies.id),
  status: text("status"),
  claimAmount: numeric("claim_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  approvedAmount: numeric("approved_amount", { precision: 14, scale: 2 }).default("0"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  denialReason: text("denial_reason"),
  appealDeadline: timestamp("appeal_deadline"),
  notes: text("notes"),
  documents: jsonb("documents").default([]),
}, (table) => ({
  claimsTenantIdx: index("claims_tenant_idx").on(table.tenantId),
  claimsInvoiceIdx: index("claims_invoice_idx").on(table.invoiceId),
  claimsPolicyIdx: index("claims_policy_idx").on(table.policyId),
}));

// Messaging
export const messages = pgTable("messages", {
  ...baseColumns,
  senderId: uuid("sender_id").references(() => users.id),
  receiverId: uuid("receiver_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  message: text("message"),
  type: text("type").default("direct"),
  read: boolean("read").default(false),
}, (table) => ({
  messageSenderIdx: index("message_sender_idx").on(table.senderId),
  messageReceiverIdx: index("message_receiver_idx").on(table.receiverId),
}));

export const messagePresence = pgTable("message_presence", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  context: text("context").default("messages").notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
}, (table) => ({
  messagePresenceUserIdx: uniqueIndex("message_presence_user_idx").on(table.userId),
  messagePresenceTenantIdx: index("message_presence_tenant_idx").on(table.tenantId),
  messagePresenceLastSeenIdx: index("message_presence_last_seen_idx").on(table.lastSeenAt),
}));

export const messageTypingStates = pgTable("message_typing_states", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  receiverId: uuid("receiver_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  messageTypingPairIdx: uniqueIndex("message_typing_pair_idx").on(table.senderId, table.receiverId),
  messageTypingReceiverIdx: index("message_typing_receiver_idx").on(table.receiverId),
  messageTypingExpiresIdx: index("message_typing_expires_idx").on(table.expiresAt),
}));

export const messageCallSessions = pgTable("message_call_sessions", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  callerId: uuid("caller_id").references(() => users.id).notNull(),
  calleeId: uuid("callee_id").references(() => users.id).notNull(),
  callType: text("call_type").notNull(),
  status: text("status").default("ringing").notNull(),
  offer: jsonb("offer"),
  answer: jsonb("answer"),
  callerCandidates: jsonb("caller_candidates").default([]).notNull(),
  calleeCandidates: jsonb("callee_candidates").default([]).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  messageCallCallerIdx: index("message_call_caller_idx").on(table.callerId),
  messageCallCalleeIdx: index("message_call_callee_idx").on(table.calleeId),
  messageCallStatusIdx: index("message_call_status_idx").on(table.status),
  messageCallExpiresIdx: index("message_call_expires_idx").on(table.expiresAt),
}));

// Notifications
export const notifications = pgTable("notifications", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id").references(() => users.id),
  type: text("type"),
  title: text("title"),
  message: text("message"),
  metadata: jsonb("metadata"),
  read: boolean("read").default(false),
}, (table) => ({
  notificationUserIdx: index("notification_user_idx").on(table.userId),
  notificationTenantIdx: index("notification_tenant_idx").on(table.tenantId),
}));

export const feedbacks = pgTable("feedbacks", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id").references(() => users.id),
  userName: text("user_name"),
  userEmail: text("user_email"),
  scope: text("scope").default("tenant").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium").notNull(),
  status: text("status").default("open").notNull(),
  patientFeedback: boolean("patient_feedback").default(false).notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  feedbackTenantIdx: index("feedback_tenant_idx").on(table.tenantId),
  feedbackUserIdx: index("feedback_user_idx").on(table.userId),
  feedbackScopeIdx: index("feedback_scope_idx").on(table.scope),
  feedbackStatusIdx: index("feedback_status_idx").on(table.status),
  feedbackTypeIdx: index("feedback_type_idx").on(table.type),
}));

// Audit
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id"),
  action: text("action"),
  entity: text("entity"),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  auditUserIdx: index("audit_user_idx").on(table.userId),
  auditTenantIdx: index("audit_tenant_idx").on(table.tenantId),
}));

// AI Logs
export const aiLogs = pgTable("ai_logs", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  patientId: uuid("patient_id").references(() => patients.id),
  type: text("type").notNull(), // "summary", "diagnosis", etc.
  input: jsonb("input"),
  output: jsonb("output"),
}, (table) => ({
  aiLogPatientIdx: index("ai_log_patient_idx").on(table.patientId),
  aiLogTenantIdx: index("ai_log_tenant_idx").on(table.tenantId),
}));

// Provisioning Runs
export const provisioningRuns = pgTable("provisioning_runs", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  status: text("status").notNull(), // "running", "completed", "failed"
  stage: text("stage"), // current/last stage when failed
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // stage details, logs, etc.
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  provisioningTenantIdx: index("provisioning_tenant_idx").on(table.tenantId),
  provisioningStatusIdx: index("provisioning_status_idx").on(table.status),
}));

// OTP Management
export const otps = pgTable("otps", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id").references(() => users.id),
  code: text("code").notNull(),
  type: text("type").notNull(), // "password_reset", "2fa", "email_verification"
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
}, (table) => ({
  otpUserIdx: index("otp_user_idx").on(table.userId),
  otpTenantIdx: index("otp_tenant_idx").on(table.tenantId),
  otpTypeIdx: index("otp_type_idx").on(table.type),
}));

// Password Reset Requests
export const passwordResets = pgTable("password_resets", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id").references(() => users.id),
  requestedBy: uuid("requested_by").references(() => users.id), // null if user requested it themselves
  status: text("status").notNull(), // "pending", "completed", "expired"
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  approvedBy: uuid("approved_by").references(() => users.id), // admin who approved
  approvalNotes: text("approval_notes"),
}, (table) => ({
  passwordResetUserIdx: index("password_reset_user_idx").on(table.userId),
  passwordResetTenantIdx: index("password_reset_tenant_idx").on(table.tenantId),
  passwordResetStatusIdx: index("password_reset_status_idx").on(table.status),
}));

// Platform-wide settings (singleton key/value)
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});

// Per-tenant settings
export const tenantSettings = pgTable("tenant_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
}, (table) => ({
  tenantSettingsTenantIdx: index("tenant_settings_tenant_idx").on(table.tenantId),
}));

// Guardians
export const guardians = pgTable("guardians", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id").references(() => users.id),
  relationship: text("relationship"), // "parent", "guardian", "caregiver"
}, (table) => ({
  guardianUserIdx: index("guardian_user_idx").on(table.userId),
  guardianTenantIdx: index("guardian_tenant_idx").on(table.tenantId),
}));

export const guardianPatients = pgTable("guardian_patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianId: uuid("guardian_id").references(() => guardians.id),
  patientId: uuid("patient_id").references(() => patients.id),
  canViewRecords: boolean("can_view_records").default(true),
  canSchedule: boolean("can_schedule").default(true),
  emergencyContact: boolean("emergency_contact").default(false),
}, (table) => ({
  guardianPatientGuardianIdx: index("guardian_patient_guardian_idx").on(table.guardianId),
  guardianPatientPatientIdx: index("guardian_patient_patient_idx").on(table.patientId),
}));

// Integrations & Communication
export const integrations = pgTable("integrations", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(), // "twilio", "resend", "sendgrid", "stripe", "aws_s3", etc.
  isActive: boolean("is_active").default(false).notNull(),
  apiKeyEncrypted: text("api_key_encrypted"), // Store encrypted API keys
  apiSecretEncrypted: text("api_secret_encrypted"),
  accountId: text("account_id"),
  accountName: text("account_name"),
  config: jsonb("config").notNull(), // Provider-specific config
  status: text("status").default("pending"), // "pending", "testing", "active", "error"
  lastTestedAt: timestamp("last_tested_at"),
  testError: text("test_error"),
  metadata: jsonb("metadata"),
}, (table) => ({
  integrationTenantIdx: index("integration_tenant_idx").on(table.tenantId),
  integrationProviderIdx: index("integration_provider_idx").on(table.provider),
}));

// System Metrics
export const systemMetrics = pgTable("system_metrics", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  cpuUsage: integer("cpu_usage"),
  memoryUsage: integer("memory_usage"),
  diskUsage: integer("disk_usage"),
  networkIo: integer("network_io"),
  databaseSize: text("database_size"),
  activeUsers: integer("active_users"),
  apiResponseTime: integer("api_response_time"), // in milliseconds
  uptime: text("uptime"), // percentage
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  systemMetricsTenantIdx: index("system_metrics_tenant_idx").on(table.tenantId),
  systemMetricsTimestampIdx: index("system_metrics_timestamp_idx").on(table.timestamp),
}));

// System Alerts
export const systemAlerts = pgTable("system_alerts", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  message: text("message"),
  severity: text("severity").default("info"), // "info", "warning", "critical"
  type: text("type"), // "cpu_high", "memory_high", "disk_high", "maintenance", "custom"
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
}, (table) => ({
  systemAlertsTenantIdx: index("system_alerts_tenant_idx").on(table.tenantId),
  systemAlertsSeverityIdx: index("system_alerts_severity_idx").on(table.severity),
}));

// System Configuration
export const systemConfigurations = pgTable("system_configurations", {
  ...baseColumns,
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(), // "cpu_threshold", "memory_threshold", "disk_threshold", "alert_email", "alert_webhook", etc.
  value: jsonb("value").notNull(),
  description: text("description"),
}, (table) => ({
  systemConfigTenantIdx: index("system_config_tenant_idx").on(table.tenantId),
  systemConfigKeyIdx: index("system_config_key_idx").on(table.key),
}));

// Relations
export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ===== Accountant financial tables =====
export const expenses = pgTable("expenses", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  category: text("category").notNull(),
  vendor: text("vendor"),
  description: text("description"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  expenseDate: date("expense_date").notNull(),
  paymentMethod: text("payment_method"),
  reference: text("reference"),
  status: text("status").notNull().default("pending"),
  receiptUrl: text("receipt_url"),
  approvedBy: uuid("approved_by"),
  metadata: jsonb("metadata").default({}),
}, (t) => ({
  expensesTenantIdx: index("expenses_tenant_idx").on(t.tenantId),
  expensesDateIdx: index("expenses_date_idx").on(t.expenseDate),
}));

export const accountsPayable = pgTable("accounts_payable", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  vendor: text("vendor").notNull(),
  vendorEmail: text("vendor_email"),
  invoiceNumber: text("invoice_number"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  status: text("status").notNull().default("open"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
}, (t) => ({
  apTenantIdx: index("ap_tenant_idx").on(t.tenantId),
  apStatusIdx: index("ap_status_idx").on(t.status),
}));

export const budgets = pgTable("budgets", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  period: text("period").notNull().default("monthly"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  spent: numeric("spent", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").default({}),
}, (t) => ({
  budgetsTenantIdx: index("budgets_tenant_idx").on(t.tenantId),
}));

export const journalEntries = pgTable("journal_entries", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  entryDate: date("entry_date").notNull(),
  reference: text("reference"),
  description: text("description"),
  debitAccount: text("debit_account").notNull(),
  creditAccount: text("credit_account").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  postedBy: uuid("posted_by"),
  status: text("status").notNull().default("posted"),
  metadata: jsonb("metadata").default({}),
}, (t) => ({
  journalTenantIdx: index("journal_tenant_idx").on(t.tenantId),
  journalDateIdx: index("journal_date_idx").on(t.entryDate),
}));

export const taxRecords = pgTable("tax_records", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  period: text("period").notNull(),
  taxType: text("tax_type").notNull(),
  jurisdiction: text("jurisdiction"),
  taxableAmount: numeric("taxable_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  dueDate: date("due_date"),
  filedAt: timestamp("filed_at"),
  status: text("status").notNull().default("draft"),
  reference: text("reference"),
  metadata: jsonb("metadata").default({}),
}, (t) => ({
  taxRecordsTenantIdx: index("tax_records_tenant_idx").on(t.tenantId),
}));

export const emailSendLog = pgTable("email_send_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tenantId: uuid("tenant_id"),
  toAddress: text("to_address").notNull(),
  fromAddress: text("from_address"),
  subject: text("subject"),
  template: text("template"),
  status: text("status").notNull().default("queued"),
  provider: text("provider").default("resend"),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  metadata: jsonb("metadata").default({}),
}, (t) => ({
  emailLogTenantIdx: index("email_log_tenant_idx").on(t.tenantId),
  emailLogStatusIdx: index("email_log_status_idx").on(t.status),
}));

export const accountantReportTemplates = pgTable("accountant_report_templates", {
  ...baseColumns,
  tenantId: uuid("tenant_id"),
  key: text("key").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("monthly"),
  estimatedTime: text("estimated_time").default("1-2 minutes"),
  config: jsonb("config").default({}),
  isSystem: boolean("is_system").notNull().default(true),
}, (table) => ({
  accountantReportTemplatesTenantIdx: index("accountant_report_templates_tenant_idx").on(table.tenantId),
  accountantReportTemplatesKeyIdx: index("accountant_report_templates_key_idx").on(table.key),
}));

export const accountantReports = pgTable("accountant_reports", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  templateId: uuid("template_id").references(() => accountantReportTemplates.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  status: text("status").notNull().default("ready"),
  format: text("format").notNull().default("pdf"),
  size: text("size"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  downloadUrl: text("download_url"),
  requestedBy: uuid("requested_by"),
  metadata: jsonb("metadata").default({}),
}, (table) => ({
  accountantReportsTenantIdx: index("accountant_reports_tenant_idx").on(table.tenantId),
  accountantReportsTemplateIdx: index("accountant_reports_template_idx").on(table.templateId),
}));

export const scheduledAccountantReports = pgTable("scheduled_accountant_reports", {
  ...baseColumns,
  tenantId: uuid("tenant_id").notNull(),
  templateId: uuid("template_id").references(() => accountantReportTemplates.id),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(),
  nextRun: timestamp("next_run").notNull(),
  recipients: jsonb("recipients").default([]),
  format: text("format").notNull().default("pdf"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by"),
  metadata: jsonb("metadata").default({}),
}, (table) => ({
  scheduledAccountantReportsTenantIdx: index("scheduled_accountant_reports_tenant_idx").on(table.tenantId),
  scheduledAccountantReportsTemplateIdx: index("scheduled_accountant_reports_template_idx").on(table.templateId),
}));
