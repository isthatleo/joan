import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { COPILOT_ACCESS_DENIED_MESSAGE, resolveCopilotAccess, type CopilotAccess } from "./access";
import type { CopilotActor } from "./types";

type ActorResult =
  | { ok: true; actor: CopilotActor }
  | { ok: false; status: number; error: string };

type RequestContextResult =
  | { ok: true; actor: CopilotActor; access: CopilotAccess }
  | { ok: false; status: number; error: string };

type ActorRow = {
  id: string;
  tenantId: string | null;
  email: string;
  fullName: string | null;
  baseRole: string | null;
  linkedRole: string | null;
};

function isDoctorRow(row: ActorRow): boolean {
  return (
    String(row.baseRole ?? "").trim().toLowerCase() === "doctor" ||
    String(row.linkedRole ?? "").trim().toLowerCase() === "doctor"
  );
}

/**
 * Resolves the signed-in app user from the Better Auth session. Copilot is
 * available to every active user with a tenant; `isDoctor` is returned so
 * routes can explicitly choose assignment scoping for doctors and tenant-only
 * scoping for everyone else.
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
      linkedRole: roles.name,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        ilike(users.email, session.user.email),
        isNull(users.deletedAt),
        eq(users.isActive, true)
      )
    );

  // Prefer a tenant-scoped doctor row when duplicate app users share an email;
  // that choice keeps doctor assignment scoping intact.
  const tenantRows = rows.filter((row) => row.tenantId);
  const activeUser = tenantRows.find(isDoctorRow) ?? tenantRows[0] ?? rows[0];

  if (!activeUser) {
    return { ok: false, status: 403, error: "No active user account found for this session" };
  }
  if (!activeUser.tenantId) {
    return { ok: false, status: 403, error: "Tenant context required" };
  }

  return {
    ok: true,
    actor: {
      userId: activeUser.id,
      tenantId: activeUser.tenantId,
      email: activeUser.email,
      fullName: activeUser.fullName ?? null,
      isDoctor: rows.some((row) => row.id === activeUser.id && isDoctorRow(row)),
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
