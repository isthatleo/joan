import { z } from "zod";

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const next = value.trim();
  return next === "" ? undefined : next;
};

const money = (field: string, { optional = false } = {}) => {
  const schema = z.preprocess(
    (value) => {
      if (value == null || value === "") return undefined;
      if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(2);
      if (typeof value === "string") {
        const parsed = Number(value.trim().replace(/,/g, ""));
        if (Number.isFinite(parsed)) return parsed.toFixed(2);
      }
      return value;
    },
    z
      .string()
      .regex(/^\d+(\.\d{2})?$/, `${field} must be a valid amount`)
      .refine((value) => Number(value) >= 0, `${field} must be non-negative`)
  );
  return optional ? schema.optional() : schema;
};

const isoDate = (field: string, { optional = false } = {}) => {
  const schema = z.preprocess(
    (value) => {
      if (value == null || value === "") return undefined;
      if (typeof value === "string") {
        const parsed = new Date(value.trim());
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      }
      return value;
    },
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${field} must be a valid date`)
  );
  return optional ? schema.optional() : schema;
};

const timestampField = (field: string, { optional = false } = {}) => {
  const schema = z.preprocess(
    (value) => {
      if (value == null || value === "") return undefined;
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
      if (typeof value === "string") {
        const parsed = new Date(value.trim());
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
      }
      return value;
    },
    z.string().datetime({ message: `${field} must be a valid timestamp` })
  );
  return optional ? schema.optional() : schema;
};

const requiredString = (field: string) =>
  z.preprocess(trimmed, z.string().min(1, `${field} is required`));

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());

const enumField = <TValues extends readonly [string, ...string[]]>(
  values: TValues,
  fallback: TValues[number]
) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value ?? fallback;
      const normalized = value.trim().toLowerCase();
      return normalized || fallback;
    },
    z.enum(values).default(fallback)
  );

const jsonField = z.preprocess(
  (value) => {
    if (value == null || value === "") return {};
    return value;
  },
  z.record(z.string(), z.unknown()).default({})
);

const stringArrayField = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [];
  },
  z.array(z.string()).default([])
);

const quantityField = z.preprocess(
  (value) => {
    if (value == null || value === "") return 1;
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return Math.trunc(parsed);
    }
    return value;
  },
  z.number().int().positive().default(1)
);

const invoiceItemSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object") return value;
    const item = value as Record<string, unknown>;
    if (item.amount != null && item.amount !== "") return item;

    const quantity = Number(item.quantity ?? 1);
    const unitPriceRaw = item.unitPrice;
    const unitPrice =
      typeof unitPriceRaw === "number"
        ? unitPriceRaw
        : typeof unitPriceRaw === "string"
          ? Number(unitPriceRaw.trim().replace(/,/g, ""))
          : Number.NaN;

    if (Number.isFinite(quantity) && Number.isFinite(unitPrice)) {
      return {
        ...item,
        amount: (quantity * unitPrice).toFixed(2),
      };
    }

    return item;
  },
  z.object({
    description: requiredString("item description"),
    amount: money("item amount"),
    quantity: quantityField.optional(),
    unitPrice: money("item unitPrice", { optional: true }),
    category: optionalString,
  })
);

const invoiceStatusField = enumField(
  ["draft", "sent", "viewed", "partial", "paid", "overdue"] as const,
  "draft"
);

export const invoiceCreateSchema = z.object({
  patientId: requiredString("patientId"),
  amount: money("amount"),
  amountDue: money("amountDue", { optional: true }),
  dueDate: isoDate("dueDate"),
  description: optionalString,
  notes: optionalString,
  paymentTerms: optionalString,
  items: z.array(invoiceItemSchema).optional(),
  status: invoiceStatusField,
});

export const invoiceUpdateSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object") return value;
    const raw = value as Record<string, unknown>;
    return {
      ...raw,
      amount: raw.amount ?? raw.totalAmount,
    };
  },
  z
    .object({
      patientId: optionalString,
      amount: money("amount", { optional: true }),
      amountDue: money("amountDue", { optional: true }),
      dueDate: isoDate("dueDate", { optional: true }),
      description: optionalString,
      notes: optionalString,
      paymentTerms: optionalString,
      items: z.array(invoiceItemSchema).optional(),
      status: invoiceStatusField.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required")
);

export const paymentCreateSchema = z.object({
  invoiceId: requiredString("invoiceId"),
  amount: money("amount"),
  method: enumField(["cash", "credit_card", "mobile_money", "bank_transfer", "insurance", "other"] as const, "credit_card"),
  transactionId: optionalString,
  notes: optionalString,
  fee: money("fee", { optional: true }),
  status: enumField(["pending", "completed", "failed", "refunded"] as const, "pending"),
});

export const paymentUpdateSchema = z
  .object({
    amount: money("amount", { optional: true }),
    method: enumField(["cash", "credit_card", "mobile_money", "bank_transfer", "insurance", "other"] as const, "credit_card").optional(),
    transactionId: optionalString,
    notes: optionalString,
    fee: money("fee", { optional: true }),
    status: enumField(["pending", "completed", "failed", "refunded"] as const, "pending").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const claimCreateSchema = z.object({
  invoiceId: optionalString,
  patientId: requiredString("patientId"),
  insuranceProvider: requiredString("insuranceProvider"),
  policyNumber: requiredString("policyNumber"),
  claimAmount: money("claimAmount"),
  approvedAmount: money("approvedAmount", { optional: true }),
  status: enumField(["submitted", "under_review", "approved", "denied", "paid", "appealed"] as const, "submitted"),
  submittedAt: timestampField("submittedAt", { optional: true }),
  processedAt: timestampField("processedAt", { optional: true }),
  denialReason: optionalString,
  appealDeadline: timestampField("appealDeadline", { optional: true }),
  notes: optionalString,
  documents: z
    .array(
      z.object({
        id: optionalString,
        name: requiredString("document name"),
        type: optionalString,
        uploadedAt: timestampField("uploadedAt", { optional: true }),
      })
    )
    .optional(),
});

export const claimUpdateSchema = claimCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const appealSchema = z.object({
  reason: requiredString("reason"),
});

export const invoiceBulkActionSchema = z.object({
  action: enumField(["mark_paid", "send_reminder"] as const, "mark_paid"),
  invoiceIds: z.array(z.string().min(1)).min(1, "invoiceIds is required"),
});

export const paymentBulkActionSchema = z.object({
  action: enumField(["retry_failed"] as const, "retry_failed"),
  paymentIds: z.array(z.string().min(1)).min(1, "paymentIds is required"),
});

export const claimBulkActionSchema = z.object({
  action: enumField(["submit_selected", "mark_under_review"] as const, "submit_selected"),
  claimIds: z.array(z.string().min(1)).min(1, "claimIds is required"),
});

export const markInvoicePaidSchema = z.object({
  paidAt: timestampField("paidAt", { optional: true }),
});

export const refundSchema = z.object({
  amount: money("amount"),
});

export const reportGenerateSchema = z.object({
  templateId: optionalString,
  format: enumField(["pdf", "csv", "html", "excel"] as const, "pdf"),
  name: optionalString,
  description: optionalString,
  type: optionalString,
  metadata: jsonField,
});

export const reportTemplateCreateSchema = z.object({
  key: optionalString,
  name: requiredString("name"),
  type: requiredString("type"),
  category: requiredString("category"),
  description: optionalString,
  frequency: enumField(["daily", "weekly", "monthly", "quarterly", "custom"] as const, "monthly"),
  estimatedTime: optionalString,
  config: jsonField,
});

export const reportScheduleSchema = z.object({
  templateId: requiredString("templateId"),
  name: optionalString,
  frequency: enumField(["daily", "weekly", "monthly", "quarterly", "custom"] as const, "monthly"),
  recipients: stringArrayField,
  format: enumField(["pdf", "csv", "excel"] as const, "pdf"),
  nextRun: timestampField("nextRun", { optional: true }),
});

export const reportScheduleUpdateSchema = z
  .object({
    name: optionalString,
    frequency: enumField(["daily", "weekly", "monthly", "quarterly", "custom"] as const, "monthly").optional(),
    recipients: stringArrayField.optional(),
    format: enumField(["pdf", "csv", "excel"] as const, "pdf").optional(),
    nextRun: timestampField("nextRun", { optional: true }),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const reminderSchema = z.object({
  to: optionalEmail,
  note: optionalString,
});

export const accountantSettingsSchema = z.object({
  profile: z.object({
    name: requiredString("profile.name"),
    email: z.preprocess(trimmed, z.string().email("profile.email must be a valid email")),
    phone: z.preprocess((value) => (value == null ? "" : String(value).trim()), z.string()),
    avatar: z.preprocess((value) => (value == null ? "" : String(value).trim()), z.string()),
  }),
  notifications: z.object({
    emailNotifications: z.boolean(),
    paymentReminders: z.boolean(),
    reportAlerts: z.boolean(),
    systemUpdates: z.boolean(),
  }),
  preferences: z.object({
    currency: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
      z.string().length(3, "preferences.currency must be a 3-letter code")
    ),
    dateFormat: requiredString("preferences.dateFormat"),
    theme: requiredString("preferences.theme"),
    language: requiredString("preferences.language"),
  }),
  security: z.object({
    twoFactorEnabled: z.boolean(),
    sessionTimeout: z.preprocess(
      (value) => (typeof value === "string" ? Number(value.trim()) : value),
      z.number().int().positive("security.sessionTimeout must be positive")
    ),
    passwordLastChanged: timestampField("security.passwordLastChanged"),
  }),
  billing: z.object({
    defaultPaymentTerms: z.preprocess(
      (value) => (typeof value === "string" ? Number(value.trim()) : value),
      z.number().int().nonnegative("billing.defaultPaymentTerms must be non-negative")
    ),
    lateFeePercentage: z.preprocess(
      (value) => (typeof value === "string" ? Number(value.trim()) : value),
      z.number().nonnegative("billing.lateFeePercentage must be non-negative")
    ),
    autoSendInvoices: z.boolean(),
    autoSendReminders: z.boolean(),
  }),
});
