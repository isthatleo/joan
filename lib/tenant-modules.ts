export const DEFAULT_TENANT_MODULES: Record<string, boolean> = {
  appointments: true,
  pharmacy: true,
  lab: true,
  billing: true,
  guardians: true,
  patientPortal: true,
  messaging: true,
  reports: true,
  analytics: true,
  queue: true,
  vitals: true,
  carePlans: true,
  feedback: true,
  inventory: true,
  qualityControl: true,
  emergency: false,
  telemedicine: false,
  insurance: true,
  inpatient: true,
};

export function normalizeTenantModules(input: unknown): Record<string, boolean> {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const normalized: Record<string, boolean> = { ...DEFAULT_TENANT_MODULES };
  for (const [key, value] of Object.entries(source)) {
    normalized[key] = value === true;
  }
  return normalized;
}

export function isTenantModuleEnabled(modules: Record<string, boolean> | null | undefined, key?: string | null) {
  if (!key) return true;
  const normalized = normalizeTenantModules(modules);
  return normalized[key] !== false;
}

export function getModuleKeyForPath(path: string) {
  if (path.startsWith("/guardian")) return "guardians";
  if (path === "/patient" || path === "/my-health" || path.startsWith("/patient-portal")) return "patientPortal";
  if (path === "/messages") return "messaging";
  if (path.includes("/feedback") || path === "/feedback") return "feedback";
  if (path.includes("/analytics") || path.includes("/reports")) return "analytics";
  if (path === "/appointments" || path.startsWith("/doctor/appointments") || path.startsWith("/patient-portal/appointments") || path.startsWith("/guardian/appointments") || path === "/check-in") return "appointments";
  if (path.includes("/queue")) return "queue";
  if (path.startsWith("/nurse/vitals")) return "vitals";
  if (path.startsWith("/nurse/care-plans")) return "carePlans";
  if (path.startsWith("/nurse/beds")) return "inpatient";
  if (path === "/emergency") return "emergency";
  if (path.startsWith("/lab")) {
    if (path.includes("/lab-inventory")) return "inventory";
    if (path.includes("/lab-qc")) return "qualityControl";
    return "lab";
  }
  if (path.startsWith("/pharmacy")) return "pharmacy";
  if (path.startsWith("/accountant") || path === "/billing") {
    if (path.includes("insurance")) return "insurance";
    return "billing";
  }
  return null;
}
