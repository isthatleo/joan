type SmokeResult = {
  name: string;
  ok: boolean;
  status?: number;
  detail?: string;
  skipped?: boolean;
};

type RequestSpec = {
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  cookie?: string;
  expectedStatuses?: number[];
};

const BASE_URL = (process.env.E2E_BASE_URL || "https://joanhealth.tech/").replace(/\/$/, "");
const TENANT_SLUG = process.env.E2E_TENANT_SLUG || "test-general";
const AUTH_COOKIE = process.env.E2E_AUTH_COOKIE || "";
const HOSPITAL_ADMIN_COOKIE = process.env.E2E_HOSPITAL_ADMIN_COOKIE || AUTH_COOKIE;
const SUPER_ADMIN_COOKIE = process.env.E2E_SUPER_ADMIN_COOKIE || AUTH_COOKIE;

const criticalTenantPages = [
  `/tenant/${TENANT_SLUG}/login`,
  `/tenant/${TENANT_SLUG}/admin`,
  `/tenant/${TENANT_SLUG}/appointments`,
  `/tenant/${TENANT_SLUG}/patients`,
  `/tenant/${TENANT_SLUG}/staff-management`,
  `/tenant/${TENANT_SLUG}/settings`,
  `/tenant/${TENANT_SLUG}/messages`,
];

const criticalSuperAdminPages = [
  "/super-admin",
  "/tenants",
  "/tenants/subscription-plans",
  "/super-admin/billing",
  "/super-admin/system-health",
  "/super-admin/settings",
];

const unauthenticatedMutationChecks: RequestSpec[] = [
  { name: "assign-role blocks anonymous writes", method: "POST", path: "/api/auth/assign-role", body: { userId: "00000000-0000-0000-0000-000000000000", roleName: "admin" } },
  { name: "billing blocks anonymous invoice creation", method: "POST", path: "/api/billing", body: { patientId: "00000000-0000-0000-0000-000000000000", items: [], totalAmount: "1" } },
  { name: "payments blocks anonymous payment creation", method: "POST", path: "/api/payments", body: { invoiceId: "00000000-0000-0000-0000-000000000000", method: "cash", amount: "1" } },
  { name: "lab orders block anonymous creation", method: "POST", path: "/api/lab-orders", body: { visitId: "00000000-0000-0000-0000-000000000000", orderedBy: "00000000-0000-0000-0000-000000000000", tests: ["cbc"] } },
  { name: "lab results block anonymous upload", method: "POST", path: "/api/lab-results", body: { labOrderId: "00000000-0000-0000-0000-000000000000", resultData: {} } },
  { name: "prescriptions block anonymous creation", method: "POST", path: "/api/prescriptions", body: { visitId: "00000000-0000-0000-0000-000000000000", doctorId: "00000000-0000-0000-0000-000000000000", items: [] } },
  { name: "queue blocks anonymous add", method: "POST", path: "/api/queue/add", body: { patientId: "00000000-0000-0000-0000-000000000000" } },
  { name: "visits block anonymous creation", method: "POST", path: "/api/visits", body: { patientId: "00000000-0000-0000-0000-000000000000" } },
  { name: "vitals block anonymous creation", method: "POST", path: "/api/vitals", body: { visitId: "00000000-0000-0000-0000-000000000000" } },
  { name: "operations block anonymous trigger", method: "POST", path: "/api/operations", body: { type: "backup", action: "trigger" } },
  { name: "compliance blocks anonymous writes", method: "POST", path: "/api/compliance/data", body: { action: "review" } },
];

function url(path: string) {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function runRequest(spec: RequestSpec): Promise<SmokeResult> {
  try {
    const response = await fetch(url(spec.path), {
      method: spec.method,
      headers: {
        "content-type": "application/json",
        ...(spec.cookie ? { cookie: spec.cookie } : {}),
      },
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      redirect: "manual",
    });
    const expected = spec.expectedStatuses || [401, 403];
    const ok = expected.includes(response.status);
    return {
      name: spec.name,
      ok,
      status: response.status,
      detail: ok ? undefined : `expected ${expected.join("/")} from ${spec.method} ${spec.path}`,
    };
  } catch (error) {
    return {
      name: spec.name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPageCheck(path: string, cookie: string, group: string): Promise<SmokeResult> {
  if (!cookie && path !== `/tenant/${TENANT_SLUG}/login`) {
    return {
      name: `${group}: ${path}`,
      ok: true,
      skipped: true,
      detail: "set E2E_AUTH_COOKIE, E2E_HOSPITAL_ADMIN_COOKIE, or E2E_SUPER_ADMIN_COOKIE to enable authenticated page checks",
    };
  }

  try {
    const response = await fetch(url(path), {
      headers: cookie ? { cookie } : undefined,
      redirect: "manual",
    });
    const ok = response.status < 500;
    return {
      name: `${group}: ${path}`,
      ok,
      status: response.status,
      detail: ok ? undefined : "page returned a server error",
    };
  } catch (error) {
    return {
      name: `${group}: ${path}`,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function printResult(result: SmokeResult) {
  const marker = result.skipped ? "SKIP" : result.ok ? "PASS" : "FAIL";
  const status = result.status ? ` [${result.status}]` : "";
  const detail = result.detail ? ` - ${result.detail}` : "";
  console.log(`${marker} ${result.name}${status}${detail}`);
}

async function main() {
  console.log(`Release smoke target: ${BASE_URL}`);
  console.log(`Tenant slug: ${TENANT_SLUG}`);

  const results: SmokeResult[] = [];

  for (const spec of unauthenticatedMutationChecks) {
    results.push(await runRequest(spec));
  }

  for (const page of criticalTenantPages) {
    results.push(await runPageCheck(page, HOSPITAL_ADMIN_COOKIE, "tenant"));
  }

  for (const page of criticalSuperAdminPages) {
    results.push(await runPageCheck(page, SUPER_ADMIN_COOKIE, "super-admin"));
  }

  for (const result of results) {
    printResult(result);
  }

  const failed = results.filter((result) => !result.ok);
  const skipped = results.filter((result) => result.skipped);
  console.log(`Smoke summary: ${results.length - failed.length - skipped.length} passed, ${skipped.length} skipped, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
