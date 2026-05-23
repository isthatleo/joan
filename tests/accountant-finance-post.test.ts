import test from "node:test";
import assert from "node:assert/strict";
import {
  budgetCreateSchema,
  expenseCreateSchema,
  journalCreateSchema,
  payableCreateSchema,
  taxCreateSchema,
  validateFinancePayload,
} from "@/lib/accountant/finance-api";
import {
  accountantSettingsSchema,
  claimCreateSchema,
  invoiceCreateSchema,
  invoiceUpdateSchema,
  paymentCreateSchema,
  reportGenerateSchema,
  reportScheduleSchema,
} from "@/lib/accountant/route-schemas";

test("expense schema normalizes trimmed text, currency, date, and amount", () => {
  const parsed = expenseCreateSchema.parse({
    category: "  Supplies  ",
    amount: 15,
    currency: "usd",
    expenseDate: "2026-05-22T08:00:00.000Z",
  });

  assert.equal(parsed.category, "Supplies");
  assert.equal(parsed.amount, "15.00");
  assert.equal(parsed.currency, "USD");
  assert.equal(parsed.expenseDate, "2026-05-22");
  assert.equal(parsed.status, "pending");
});

test("payable schema rejects invalid vendor email", () => {
  const parsed = payableCreateSchema.safeParse({
    vendor: "Acme Labs",
    vendorEmail: "not-an-email",
    amount: "99.50",
  });

  assert.equal(parsed.success, false);
});

test("budget schema rejects end dates before the start date", () => {
  const parsed = budgetCreateSchema.safeParse({
    name: "Quarterly Ops",
    amount: "5000.00",
    startDate: "2026-06-01",
    endDate: "2026-05-01",
  });

  assert.equal(parsed.success, false);
});

test("journal schema applies defaults and normalized amounts", () => {
  const parsed = journalCreateSchema.parse({
    debitAccount: "Cash",
    creditAccount: "Revenue",
    amount: "400",
  });

  assert.equal(parsed.amount, "400.00");
  assert.equal(parsed.currency, "USD");
  assert.equal(parsed.status, "posted");
});

test("tax schema normalizes rate, money fields, and uppercase currency", () => {
  const parsed = taxCreateSchema.parse({
    period: "2026-Q2",
    taxType: "VAT",
    taxableAmount: 1000,
    taxAmount: "180",
    rate: "0.18",
    currency: "eur",
  });

  assert.equal(parsed.taxableAmount, "1000.00");
  assert.equal(parsed.taxAmount, "180.00");
  assert.equal(parsed.rate, "0.1800");
  assert.equal(parsed.currency, "EUR");
});

test("validateFinancePayload returns a 422 response with flattened errors", async () => {
  const result = validateFinancePayload(expenseCreateSchema, {
    category: "",
    amount: "-1",
  });

  assert.equal(result.ok, false);
  assert.equal(result.response.status, 422);

  const body = await result.response.json();
  assert.equal(body.error, "Validation failed");
  assert.ok(Array.isArray(body.details.fieldErrors.category));
  assert.ok(Array.isArray(body.details.fieldErrors.amount));
});

test("invoice schema normalizes amounts and due date", () => {
  const parsed = invoiceCreateSchema.parse({
    patientId: "patient-1",
    amount: "1200",
    dueDate: "2026-05-23T00:00:00.000Z",
  });

  assert.equal(parsed.amount, "1200.00");
  assert.equal(parsed.amountDue, undefined);
  assert.equal(parsed.dueDate, "2026-05-23");
});

test("invoice schema derives item amounts from quantity and unit price", () => {
  const parsed = invoiceCreateSchema.parse({
    patientId: "patient-1",
    amount: "200",
    dueDate: "2026-05-23",
    items: [
      {
        description: "Consultation",
        quantity: 2,
        unitPrice: "100",
        category: "service",
      },
    ],
  });

  assert.equal(parsed.items?.[0]?.amount, "200.00");
  assert.equal(parsed.items?.[0]?.quantity, 2);
});

test("invoice update schema maps totalAmount into amount", () => {
  const parsed = invoiceUpdateSchema.parse({
    totalAmount: "250",
    status: "sent",
  });

  assert.equal(parsed.amount, "250.00");
  assert.equal(parsed.status, "sent");
});

test("payment schema applies method and status defaults", () => {
  const parsed = paymentCreateSchema.parse({
    invoiceId: "invoice-1",
    amount: 55,
  });

  assert.equal(parsed.amount, "55.00");
  assert.equal(parsed.method, "credit_card");
  assert.equal(parsed.status, "pending");
});

test("claim schema requires real claim fields and normalizes timestamps", () => {
  const parsed = claimCreateSchema.parse({
    patientId: "patient-1",
    insuranceProvider: "AAR",
    policyNumber: "POL-123",
    claimAmount: "250",
    submittedAt: "2026-05-20",
  });

  assert.equal(parsed.claimAmount, "250.00");
  assert.equal(parsed.status, "submitted");
  assert.ok(parsed.submittedAt?.startsWith("2026-05-20"));
});

test("report generate schema supports custom reports", () => {
  const parsed = reportGenerateSchema.parse({
    name: "My Custom Report",
    description: "Custom scope",
    type: "custom",
    format: "csv",
  });

  assert.equal(parsed.format, "csv");
  assert.equal(parsed.name, "My Custom Report");
});

test("report schedule schema converts comma separated recipients into arrays", () => {
  const parsed = reportScheduleSchema.parse({
    templateId: "template-1",
    frequency: "weekly",
    recipients: "a@example.com, b@example.com",
  });

  assert.deepEqual(parsed.recipients, ["a@example.com", "b@example.com"]);
  assert.equal(parsed.format, "pdf");
});

test("accountant settings schema validates nested settings payloads", () => {
  const parsed = accountantSettingsSchema.parse({
    profile: {
      name: "Accountant",
      email: "accountant@example.com",
      phone: "0700000000",
      avatar: "",
    },
    notifications: {
      emailNotifications: true,
      paymentReminders: true,
      reportAlerts: false,
      systemUpdates: false,
    },
    preferences: {
      currency: "usd",
      dateFormat: "MM/DD/YYYY",
      theme: "system",
      language: "en",
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: "60",
      passwordLastChanged: "2026-05-23T00:00:00.000Z",
    },
    billing: {
      defaultPaymentTerms: "30",
      lateFeePercentage: "1.5",
      autoSendInvoices: true,
      autoSendReminders: true,
    },
  });

  assert.equal(parsed.preferences.currency, "USD");
  assert.equal(parsed.security.sessionTimeout, 60);
  assert.equal(parsed.billing.defaultPaymentTerms, 30);
});
