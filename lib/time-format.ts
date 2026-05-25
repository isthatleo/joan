export type UserTimeFormat = "12h" | "24h";

export function getUserTimeFormat(): UserTimeFormat {
  if (typeof document !== "undefined") {
    const datasetValue = document.documentElement.dataset.timeFormat;
    if (datasetValue === "24h" || datasetValue === "12h") return datasetValue;
  }
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("joan-time-format");
    if (stored === "24h" || stored === "12h") return stored;
  }
  return "12h";
}

export function formatTimeForUser(value: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: getUserTimeFormat() === "12h",
    ...options,
  }).format(date);
}

export function formatDateTimeForUser(value: Date | string | number, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: getUserTimeFormat() === "12h",
    ...options,
  }).format(date);
}
