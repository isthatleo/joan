import { parseLabResultData } from "@/lib/doctor/lab-results";

export type PatientHistoryTimelineItem = {
  id: string;
  type: "visit" | "appointment" | "lab_order" | "lab_result" | "prescription" | "condition" | "allergy";
  title: string;
  description: string;
  date: string;
  status?: string | null;
  category?: string | null;
  provider?: string | null;
  meta?: Record<string, unknown>;
};

export function sortTimeline<T extends { date: string | Date | null | undefined }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
}

export function summarizeLabResult(raw: unknown, fileUrl?: string | null) {
  const parsed = parseLabResultData(raw, fileUrl);
  const abnormalCount = parsed.values.filter((item) => item.flag !== "normal").length;
  return {
    parsed,
    summary: abnormalCount > 0 ? `${abnormalCount} abnormal value(s)` : parsed.summary,
    flag: parsed.values.some((item) => item.flag === "critical")
      ? "critical"
      : parsed.values.some((item) => item.flag !== "normal")
        ? "abnormal"
        : "normal",
  };
}
