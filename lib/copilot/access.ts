import { can, resolvePermissions } from "@/lib/auth/permission-engine";
import type { CopilotContext, CopilotFact, CopilotFactCategory } from "./types";

export const COPILOT_ACCESS_DENIED_MESSAGE =
  "Your role does not grant access to clinical data through Copilot.";

/**
 * Every clinical fact in a Copilot context is already scoped by tenant and,
 * for doctors, by assignment in `lib/copilot/context.ts`. `own`-scoped
 * permissions are only treated as satisfied when that assignment scope is
 * verified; tenant-only callers do not get it implied by a client-supplied id.
 */
function permissionContext(scopeToAssignee: boolean) {
  return { isOwner: scopeToAssignee } as const;
}

const CATEGORY_PERMISSIONS: Record<CopilotFactCategory, string[]> = {
  queue: ["appointment.read"],
  appointment: ["appointment.read"],
  lab: ["lab.read", "lab.results"],
  prescription: ["pharmacy.read", "pharmacy.dispense"],
  vitals: ["patient.read", "vitals.read"],
  visit: ["patient.read"],
  condition: ["patient.read"],
  allergy: ["patient.read"],
};

export type CopilotAccess = {
  allowedCategories: Set<CopilotFactCategory>;
  hasClinicalAccess: boolean;
};

export async function resolveCopilotAccess(
  userId: string,
  options: { scopeToAssignee?: boolean } = {}
): Promise<CopilotAccess> {
  const permissions = await resolvePermissions(userId);
  const context = permissionContext(options.scopeToAssignee === true);

  const hasAdminOverride = can(permissions, "admin.manage", context);
  const hasPatientRead = hasAdminOverride || can(permissions, "patient.read", context);

  const allowedCategories = new Set<CopilotFactCategory>();

  if (hasPatientRead) {
    for (const [category, required] of Object.entries(CATEGORY_PERMISSIONS) as Array<
      [CopilotFactCategory, string[]]
    >) {
      const allowed =
        hasAdminOverride ||
        required.some((permission) => can(permissions, permission, context));

      if (allowed) allowedCategories.add(category);
    }
  }

  return {
    allowedCategories,
    hasClinicalAccess: hasPatientRead && allowedCategories.size > 0,
  };
}

function recountFacts(facts: CopilotFact[]) {
  return {
    labResultsToReview: facts.filter((fact) => fact.category === "lab" && fact.priority !== "routine").length,
    prescriptionRefillsToReview: facts.filter((fact) => fact.category === "prescription").length,
    urgentQueueCount: facts.filter(
      (fact) => fact.category === "queue" && (fact.priority === "critical" || fact.priority === "urgent")
    ).length,
    queueWaitingCount: facts.filter((fact) => fact.category === "queue").length,
  };
}

export function filterContextByAccess(
  context: CopilotContext,
  access: CopilotAccess
): CopilotContext {
  const facts = context.facts.filter((fact) => access.allowedCategories.has(fact.category));
  const allowedPatientIds = Array.from(
    new Set(facts.map((fact) => fact.patientId).filter((id): id is string => Boolean(id)))
  );

  return {
    ...context,
    facts,
    allowedPatientIds,
    counts: recountFacts(facts),
  };
}
