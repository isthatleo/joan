import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!user?.tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 400 });
    }

    // Fetch recent audit logs. Missing audit data should not break dashboard rendering.
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, user.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20)
      .catch((error) => {
        console.error("Error fetching audit logs:", error);
        return [];
      });

    const actorIds = Array.from(new Set(logs.map((log) => log.userId).filter(Boolean))) as string[];
    const actors = actorIds.length
      ? await db
          .select({ id: users.id, fullName: users.fullName, email: users.email })
          .from(users)
          .where(inArray(users.id, actorIds))
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor.fullName || actor.email]));

    const activities = logs.map((log) => {
      const actionMap: { [key: string]: string } = {
        create: "Created",
        update: "Updated",
        delete: "Deleted",
        view: "Viewed",
        export: "Exported",
        import: "Imported",
        login: "Logged in",
        logout: "Logged out",
      };

      const typeMap: { [key: string]: "success" | "info" | "warning" | "error" } = {
        create: "success",
        update: "info",
        delete: "warning",
        view: "info",
        export: "success",
        import: "success",
        login: "success",
        logout: "info",
      };

      const normalizedAction = log.action?.toLowerCase() || "";
      const action = actionMap[normalizedAction] || log.action || "Performed action";
      const type = typeMap[normalizedAction] || "info";
      const entity = log.entity ? log.entity.replace(/_/g, " ") : "record";

      return {
        id: log.id,
        action: `${action} ${entity}`,
        actor: log.userId ? actorById.get(log.userId) || "Unknown user" : "System",
        timestamp: log.createdAt,
        type,
      };
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json([]);
  }
}

