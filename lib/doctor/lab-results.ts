import { labResults } from "@/lib/db/schema";

export type ParsedLabValue = {
  name: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: "normal" | "high" | "low" | "critical" | "abnormal";
  interpretation?: string;
};

export type ParsedLabResult = {
  summary: string;
  values: ParsedLabValue[];
  flag: ParsedLabValue["flag"];
  notes: string | null;
  attachments: string[];
  status: string;
  publishedAt: string | null;
  acceptedAt: string | null;
  acceptedByDoctorId: string | null;
  acceptedByDoctorName: string | null;
  requestedRepeatAt: string | null;
  followUpOrderId: string | null;
  fileUrl: string | null;
};

const NORMALIZED_FLAGS = new Set(["normal", "high", "low", "critical", "abnormal"]);

function normalizeFlag(value: unknown): ParsedLabValue["flag"] {
  const raw = String(value || "normal").toLowerCase();
  if (NORMALIZED_FLAGS.has(raw)) return raw as ParsedLabValue["flag"];
  if (raw.includes("critical")) return "critical";
  if (raw.includes("high")) return "high";
  if (raw.includes("low")) return "low";
  if (raw.includes("abnormal")) return "abnormal";
  return "normal";
}

function recordToValues(record: Record<string, unknown>): ParsedLabValue[] {
  return Object.entries(record)
    .filter(
      ([key]) =>
        ![
          "summary",
          "notes",
          "attachments",
          "status",
          "publishedAt",
          "acceptedAt",
          "acceptedByDoctorId",
          "acceptedByDoctorName",
          "requestedRepeatAt",
          "followUpOrderId",
          "values",
        ].includes(key)
    )
    .map(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const row = value as Record<string, unknown>;
        return {
          name: String(row.name || key),
          value: String(row.value ?? row.result ?? "-"),
          unit: row.unit ? String(row.unit) : undefined,
          referenceRange: row.referenceRange ? String(row.referenceRange) : undefined,
          flag: normalizeFlag(row.flag),
          interpretation: row.interpretation ? String(row.interpretation) : undefined,
        };
      }
      return {
        name: key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        value: String(value ?? "-"),
        flag: "normal",
      };
    });
}

export function parseLabResultData(raw: unknown, fileUrl?: string | null): ParsedLabResult {
  const payload =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const values = Array.isArray(payload.values)
    ? payload.values.map((entry, index) => {
        const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
        return {
          name: String(row.name || `Result ${index + 1}`),
          value: String(row.value ?? row.result ?? "-"),
          unit: row.unit ? String(row.unit) : undefined,
          referenceRange: row.referenceRange ? String(row.referenceRange) : undefined,
          flag: normalizeFlag(row.flag),
          interpretation: row.interpretation ? String(row.interpretation) : undefined,
        } satisfies ParsedLabValue;
      })
    : recordToValues(payload);

  const flag = values.some((value) => value.flag === "critical")
    ? "critical"
    : values.some((value) => value.flag === "abnormal")
      ? "abnormal"
      : values.some((value) => value.flag === "high")
        ? "high"
        : values.some((value) => value.flag === "low")
          ? "low"
          : "normal";

  return {
    summary: String(
      payload.summary ||
        (values.length === 1 ? `${values[0].name}: ${values[0].value}` : `${values.length} lab values recorded`)
    ),
    values,
    flag,
    notes: payload.notes ? String(payload.notes) : null,
    attachments: Array.isArray(payload.attachments) ? payload.attachments.map((item) => String(item)) : [],
    status: String(payload.status || "pending_review"),
    publishedAt: payload.publishedAt ? String(payload.publishedAt) : null,
    acceptedAt: payload.acceptedAt ? String(payload.acceptedAt) : null,
    acceptedByDoctorId: payload.acceptedByDoctorId ? String(payload.acceptedByDoctorId) : null,
    acceptedByDoctorName: payload.acceptedByDoctorName ? String(payload.acceptedByDoctorName) : null,
    requestedRepeatAt: payload.requestedRepeatAt ? String(payload.requestedRepeatAt) : null,
    followUpOrderId: payload.followUpOrderId ? String(payload.followUpOrderId) : null,
    fileUrl: fileUrl || null,
  };
}

export function serializeLabResultData(parsed: ParsedLabResult) {
  return {
    summary: parsed.summary,
    values: parsed.values,
    flag: parsed.flag,
    notes: parsed.notes,
    attachments: parsed.attachments,
    status: parsed.status,
    publishedAt: parsed.publishedAt,
    acceptedAt: parsed.acceptedAt,
    acceptedByDoctorId: parsed.acceptedByDoctorId,
    acceptedByDoctorName: parsed.acceptedByDoctorName,
    requestedRepeatAt: parsed.requestedRepeatAt,
    followUpOrderId: parsed.followUpOrderId,
  };
}

export type LabResultRecord = typeof labResults.$inferSelect;
