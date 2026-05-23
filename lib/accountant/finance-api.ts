import { z } from "zod";

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const normalizeDate = (value: unknown) => {
  if (value == null || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const normalizeMoney = (value: unknown) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/,/g, "");
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(2);
    }
  }
  return value;
};

const normalizeRate = (value: unknown) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(4);
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/,/g, "");
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(4);
    }
  }
  return value;
};

const requiredString = (field: string) =>
  z.preprocess(trimString, z.string().min(1, `${field} is required`));

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const currencyCode = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : undefined;
  },
  z.string().length(3).default("USD")
);

const moneyField = (field: string, { optional = false } = {}) => {
  const schema = z.preprocess(
    normalizeMoney,
    z
      .string()
      .regex(/^-?\d+(\.\d{2})?$/, `${field} must be a valid amount`)
      .refine((value) => Number(value) >= 0, `${field} must be non-negative`)
  );
  return optional ? schema.optional() : schema;
};

const rateField = z.preprocess(
  normalizeRate,
  z
    .string()
    .regex(/^-?\d+(\.\d{4})?$/, "rate must be a valid decimal")
    .refine((value) => Number(value) >= 0, "rate must be non-negative")
    .optional()
);

const metadataField = z.preprocess(
  (value) => {
    if (value == null || value === "") return {};
    return value;
  },
  z.record(z.string(), z.unknown()).default({})
);

const dateField = (field: string, { optional = false } = {}) => {
  const schema = z.preprocess(
    normalizeDate,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${field} must be a valid date`)
  );
  return optional ? schema.optional() : schema;
};

const expenseStatuses = ["pending", "approved", "rejected", "paid", "reimbursed"] as const;
const payableStatuses = ["open", "partial", "paid", "overdue", "cancelled"] as const;
const budgetStatuses = ["active", "inactive", "closed"] as const;
const budgetPeriods = ["monthly", "quarterly", "yearly"] as const;
const journalStatuses = ["draft", "posted", "reversed"] as const;
const taxStatuses = ["draft", "filed", "paid", "overdue"] as const;

const enumField = <TValues extends readonly [string, ...string[]]>(
  values: TValues,
  fallback: TValues[number]
) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value ?? fallback;
      const trimmed = value.trim().toLowerCase();
      return trimmed || fallback;
    },
    z.enum(values).default(fallback)
  );

export const expenseCreateSchema = z.object({
  category: requiredString("category"),
  vendor: optionalString,
  description: optionalString,
  amount: moneyField("amount"),
  currency: currencyCode,
  expenseDate: dateField("expenseDate").default(() => new Date().toISOString().slice(0, 10)),
  paymentMethod: optionalString,
  reference: optionalString,
  status: enumField(expenseStatuses, "pending"),
  receiptUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
  metadata: metadataField,
});

export const expenseUpdateSchema = expenseCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const payableCreateSchema = z.object({
  vendor: requiredString("vendor"),
  vendorEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
  invoiceNumber: optionalString,
  amount: moneyField("amount"),
  amountPaid: moneyField("amountPaid", { optional: true }).default("0.00"),
  currency: currencyCode,
  issueDate: dateField("issueDate").default(() => new Date().toISOString().slice(0, 10)),
  dueDate: dateField("dueDate", { optional: true }),
  status: enumField(payableStatuses, "open"),
  notes: optionalString,
  metadata: metadataField,
});

export const payableUpdateSchema = payableCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

const budgetBaseSchema = z.object({
  name: requiredString("name"),
  category: optionalString,
  period: enumField(budgetPeriods, "monthly"),
  amount: moneyField("amount"),
  spent: moneyField("spent", { optional: true }).default("0.00"),
  currency: currencyCode,
  startDate: dateField("startDate").default(() => new Date().toISOString().slice(0, 10)),
  endDate: dateField("endDate", { optional: true }),
  status: enumField(budgetStatuses, "active"),
  metadata: metadataField,
});

export const budgetCreateSchema = budgetBaseSchema.refine(
  (value) => !value.endDate || value.endDate >= value.startDate,
  "endDate must be on or after startDate"
);

export const budgetUpdateSchema = budgetBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
).refine(
  (value) => !value.startDate || !value.endDate || value.endDate >= value.startDate,
  "endDate must be on or after startDate"
);

export const journalCreateSchema = z.object({
  entryDate: dateField("entryDate").default(() => new Date().toISOString().slice(0, 10)),
  reference: optionalString,
  description: optionalString,
  debitAccount: requiredString("debitAccount"),
  creditAccount: requiredString("creditAccount"),
  amount: moneyField("amount"),
  currency: currencyCode,
  status: enumField(journalStatuses, "posted"),
  metadata: metadataField,
});

export const journalUpdateSchema = journalCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const taxCreateSchema = z.object({
  period: requiredString("period"),
  taxType: requiredString("taxType"),
  jurisdiction: optionalString,
  taxableAmount: moneyField("taxableAmount", { optional: true }).default("0.00"),
  taxAmount: moneyField("taxAmount", { optional: true }).default("0.00"),
  rate: rateField.default("0.0000"),
  currency: currencyCode,
  dueDate: dateField("dueDate", { optional: true }),
  status: enumField(taxStatuses, "draft"),
  reference: optionalString,
  metadata: metadataField,
});

export const taxUpdateSchema = taxCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export const financeSchemas = {
  expense: { create: expenseCreateSchema, update: expenseUpdateSchema },
  payable: { create: payableCreateSchema, update: payableUpdateSchema },
  budget: { create: budgetCreateSchema, update: budgetUpdateSchema },
  journal: { create: journalCreateSchema, update: journalUpdateSchema },
  tax: { create: taxCreateSchema, update: taxUpdateSchema },
} as const;

export type FinanceResource = keyof typeof financeSchemas;

export async function parseJsonBody(request: Request) {
  try {
    return { ok: true as const, data: await request.json() };
  } catch {
    return {
      ok: false as const,
      response: Response.json({ error: "Request body must be valid JSON" }, { status: 400 }),
    };
  }
}

export function validateFinancePayload<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown
) {
  const result = schema.safeParse(payload);
  if (result.success) {
    return { ok: true as const, data: result.data };
  }

  return {
    ok: false as const,
    response: Response.json(
      {
        error: "Validation failed",
        details: result.error.flatten(),
      },
      { status: 422 }
    ),
  };
}
