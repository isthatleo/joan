import { can, resolvePermissions } from "@/lib/auth/permission-engine";
import type { CopilotContext, CopilotFact, CopilotFactCategory } from "./types";

/**
 * Every clinical fact in a Copilot context is already scoped by tenant and by
 * the signed-in doctor's assignments in `lib/copilot/context.ts`. The
 * `isOwner` flag below therefore reflects a server-verified relationship, not
 * a client-supplied id.
 */
const VERIFIED_OWNER_CONTEXT = { isOwner: true } as const;

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

export async function resolveCopilotAccess(userId: string): Promise<CopilotAccess> {
  const permissions = await resolvePermissions(userId);

  const hasAdminOverride = can(permissions, "admin.manage", VERIFIED_OWNER_CONTEXT);
  const hasPatientRead =
    hasAdminOverride || can(permissions, "patient.read", VERIFIED_OWNER_CONTEXT);

  const allowedCategories = new Set<CopilotFactCategory>();

  if (hasPatientRead) {
    for (const [category, required] of Object.entries(CATEGORY_PERMISSIONS) as Array<
      [CopilotFactCategory, string[]]
    >) {
      const allowed =
        hasAdminOverride ||
        required.some((permission) => can(permissions, permission, VERIFIED_OWNER_CONTEXT));

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
