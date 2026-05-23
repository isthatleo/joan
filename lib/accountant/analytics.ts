export const ACCOUNTANT_RANGE_TO_INTERVAL: Record<string, string> = {
  "3months": "3 months",
  "6months": "6 months",
  "12months": "12 months",
  "24months": "24 months",
};

export function normalizeAccountantRange(range: string | null | undefined) {
  return ACCOUNTANT_RANGE_TO_INTERVAL[range || ""] ? (range as keyof typeof ACCOUNTANT_RANGE_TO_INTERVAL) : "12months";
}

export function intervalForAccountantRange(range: string | null | undefined) {
  return ACCOUNTANT_RANGE_TO_INTERVAL[normalizeAccountantRange(range)];
}

export function startDateForAccountantRange(range: string | null | undefined) {
  const now = new Date();
  const normalized = normalizeAccountantRange(range);

  switch (normalized) {
    case "3months":
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case "6months":
      return new Date(now.getFullYear(), now.getMonth() - 5, 1);
    case "24months":
      return new Date(now.getFullYear(), now.getMonth() - 23, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth() - 11, 1);
  }
}

export function monthCountForAccountantRange(range: string | null | undefined) {
  const normalized = normalizeAccountantRange(range);
  if (normalized === "3months") return 3;
  if (normalized === "6months") return 6;
  if (normalized === "24months") return 24;
  return 12;
}
