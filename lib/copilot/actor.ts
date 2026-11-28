import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { COPILOT_ACCESS_DENIED_MESSAGE, resolveCopilotAccess, type CopilotAccess } from "./access";
import type { CopilotActor } from "./types";

type ActorResult =
  | { ok: true; actor: CopilotActor }
  | { ok: false; status: number; error: string };

type RequestContextResult =
  | { ok: true; actor: CopilotActor; access: CopilotAccess }
  | { ok: false; status: number; error: string };

function normalizeRole(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Resolves the signed-in app user from the Better Auth session. The link is
 * the session-verified email, compared case-insensitively but as an exact
 * value (no LIKE wildcards). More than one matching app user is rejected
 * rather than guessed, so tenant scope can never be selected heuristically.
 */
export async function resolveCopilotActor(headers: Headers): Promise<ActorResult> {
  const session = await auth.api.getSession({ headers }).catch(() => null);
  if (!session?.user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const rows = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      email: users.email,
      fullName: users.fullName,
      baseRole: users.role,
    })
    .from(users)
    .where(
      and(
        sql`lower(${users.email}) = lower(${session.user.email})`,
        isNull(users.deletedAt),
        eq(users.isActive, true)
      )
    )
    .limit(2);

  if (rows.length === 0) {
    return { ok: false, status: 403, error: "No active user account found for this session" };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      status: 403,
      error: "Ambiguous account mapping. Ask your administrator to resolve duplicate user records.",
    };
  }

  const appUser = rows[0];

  const assignedRoles = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, appUser.id))
    .catch(() => [] as Array<{ name: string | null }>);

  const roleNames = new Set(
    [appUser.baseRole, ...assignedRoles.map((role) => role.name)].map(normalizeRole)
  );

  if (roleNames.has("super_admin")) {
    return {
      ok: false,
      status: 403,
      error: "Platform super admins use Platform Copilot; clinical Copilot is tenant-scoped.",
    };
  }
  if (!appUser.tenantId) {
    return { ok: false, status: 403, error: "Tenant context required" };
  }

  return {
    ok: true,
    actor: {
      userId: appUser.id,
      tenantId: appUser.tenantId,
      email: appUser.email,
      fullName: appUser.fullName ?? null,
      isDoctor: roleNames.has("doctor"),
    },
  };
}

/**
 * Single server-side gate for every Copilot route. `resolveCopilotAccess`
 * remains the source of truth for allowed clinical categories.
 */
export async function resolveCopilotRequestContext(
  headers: Headers
): Promise<RequestContextResult> {
  const actorResult = await resolveCopilotActor(headers);
  if (!actorResult.ok) return actorResult;

  const access = await resolveCopilotAccess(actorResult.actor.userId, {
    scopeToAssignee: actorResult.actor.isDoctor,
  });
  if (!access.hasClinicalAccess) {
    return {
      ok: false,
      status: 403,
      error: COPILOT_ACCESS_DENIED_MESSAGE,
    };
  }

  return { ok: true, actor: actorResult.actor, access };
}
