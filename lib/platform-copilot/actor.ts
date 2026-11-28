import "server-only";
import type { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/platform-billing";
import type { PlatformCopilotActor } from "./types";

type PlatformActorResult =
  | { ok: true; actor: PlatformCopilotActor }
  | { ok: false; status: number; error: string };

/**
 * Separate gate for Platform Copilot. This is explicit session-derived
 * super-admin membership, not the clinical permission engine and not any
 * client-supplied role, tenant, patient, or queue identifier.
 */
export async function resolvePlatformCopilotActor(
  request: NextRequest
): Promise<PlatformActorResult> {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) {
    return gate.response.status === 401
      ? { ok: false, status: 401, error: "Unauthorized" }
      : { ok: false, status: 403, error: "Platform Copilot requires a super-admin account." };
  }

  if (gate.user.deletedAt || !gate.user.isActive) {
    return { ok: false, status: 403, error: "Platform Copilot requires an active super-admin account." };
  }

  return {
    ok: true,
    actor: {
      userId: gate.user.id,
      email: gate.user.email,
      fullName: gate.user.fullName ?? null,
    },
  };
}
