import "server-only";
import { z } from "zod";
import {
  COPILOT_CHAT_SCOPE_VERSION,
  COPILOT_FACT_CATEGORIES,
  type CopilotChatSessionScope,
  type CopilotFactCategory,
} from "./types";

export const copilotChatSessionScopeSchema = z
  .object({
    version: z.literal(COPILOT_CHAT_SCOPE_VERSION),
    tenantId: z.string().min(1),
    userId: z.string().min(1),
    patientId: z.string().min(1).nullable(),
    queueId: z.string().min(1).nullable(),
    scopeToAssignee: z.boolean(),
    allowedCategories: z.array(z.enum(COPILOT_FACT_CATEGORIES)),
  })
  .strict();

export function createCopilotChatSessionScope({
  tenantId,
  userId,
  patientId,
  queueId,
  scopeToAssignee,
  allowedCategories,
}: {
  tenantId: string;
  userId: string;
  patientId?: string | null;
  queueId?: string | null;
  scopeToAssignee: boolean;
  allowedCategories: Iterable<CopilotFactCategory>;
}): CopilotChatSessionScope {
  return {
    version: COPILOT_CHAT_SCOPE_VERSION,
    tenantId,
    userId,
    patientId: patientId ?? null,
    queueId: queueId ?? null,
    scopeToAssignee,
    allowedCategories: Array.from(new Set(allowedCategories)).sort(),
  };
}

/**
 * History is only replayable when the stored envelope exactly matches the
 * scope just rebuilt from the signed-in session. A mismatch means the browser
 * session belongs to another user, tenant, patient focus, or permission set.
 */
export function matchesCopilotChatSessionScope(
  claimed: CopilotChatSessionScope | undefined,
  expected: CopilotChatSessionScope
): boolean {
  if (!claimed) return false;

  const actualCategories = Array.from(new Set(claimed.allowedCategories)).sort();
  return (
    claimed.version === expected.version &&
    claimed.tenantId === expected.tenantId &&
    claimed.userId === expected.userId &&
    claimed.patientId === expected.patientId &&
    claimed.queueId === expected.queueId &&
    claimed.scopeToAssignee === expected.scopeToAssignee &&
    actualCategories.length === expected.allowedCategories.length &&
    actualCategories.every((category, index) => category === expected.allowedCategories[index])
  );
}
