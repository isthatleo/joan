import { sql } from "drizzle-orm";
import { patients } from "@/lib/db/schema";

export const patientNameSql = sql<string>`trim(concat(coalesce(${patients.firstName}, ''), ' ', coalesce(${patients.lastName}, '')))`;

export function parseTextList(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBloodPressure(value: string | null | undefined) {
  const [systolic, diastolic] = String(value || "").split("/");
  return {
    systolic: Number(systolic || 0),
    diastolic: Number(diastolic || 0),
  };
}

export function classifyVitalStatus(input: {
  heartRate?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  painScore?: number | null;
  bloodPressure?: string | null;
}) {
  const bp = parseBloodPressure(input.bloodPressure);

  const isCritical =
    (input.heartRate ?? 0) >= 130 ||
    (input.heartRate ?? 0) <= 45 ||
    (input.temperature ?? 0) >= 39.5 ||
    (input.temperature ?? 0) <= 35 ||
    (input.respiratoryRate ?? 0) >= 30 ||
    (input.oxygenSaturation ?? 100) <= 89 ||
    bp.systolic >= 180 ||
    bp.diastolic >= 120 ||
    (input.painScore ?? 0) >= 9;

  if (isCritical) return "critical" as const;

  const isWarning =
    (input.heartRate ?? 0) >= 110 ||
    (input.heartRate ?? 0) <= 55 ||
    (input.temperature ?? 0) >= 38 ||
    (input.respiratoryRate ?? 0) >= 22 ||
    (input.oxygenSaturation ?? 100) <= 94 ||
    bp.systolic >= 140 ||
    bp.diastolic >= 90 ||
    (input.painScore ?? 0) >= 6;

  if (isWarning) return "warning" as const;
  return "normal" as const;
}
