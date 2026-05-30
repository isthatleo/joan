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
  const tenantPathMatch = path.match(/^\/tenant\/[^/]+(\/.*)?$/);
  const normalizedPath = tenantPathMatch ? tenantPathMatch[1] || "/" : path;
  path = normalizedPath;

  if (path.startsWith("/guardian")) return "guardians";
  if (path === "/patient" || path === "/my-health" || path.startsWith("/patient-portal")) return "patientPortal";
  if (path === "/messages") return "messaging";
  if (path === "/broadcasts" || path.startsWith("/broadcasts/")) return "messaging";
  if (path.includes("/feedback") || path === "/feedback") return "feedback";
  if (path.includes("/analytics") || path.includes("/reports")) return "analytics";
  if (path === "/appointments" || path.startsWith("/doctor/appointments") || path.startsWith("/patient-portal/appointments") || path.startsWith("/guardian/appointments") || path === "/check-in") return "appointments";
  if (path === "/patients" || path.startsWith("/patients/")) return "patientPortal";
  if (path === "/prescriptions" || path.startsWith("/prescriptions/")) return "pharmacy";
  if (path === "/insurance-claims" || path.startsWith("/insurance-claims/")) return "insurance";
  if (path.startsWith("/admin/appointments")) return "appointments";
  if (path.startsWith("/admin/patients")) return "patientPortal";
  if (path.startsWith("/admin/broadcasts")) return "messaging";
  if (path.startsWith("/admin/messages")) return "messaging";
  if (path.startsWith("/admin/feedback")) return "feedback";
  if (path.startsWith("/admin/lab")) return "lab";
  if (path.startsWith("/admin/pharmacy")) return "pharmacy";
  if (path.startsWith("/admin/billing")) return "billing";
  if (path.startsWith("/admin/insurance")) return "insurance";
  if (path.startsWith("/admin/reports")) return "reports";
  if (path.startsWith("/admin/analytics")) return "analytics";
  if (path.startsWith("/admin/audit")) return "analytics";
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
