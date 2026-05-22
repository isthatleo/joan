import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

    // Fetch recent audit logs
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);

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

      const action = actionMap[log.action?.toLowerCase() || ""] || log.action || "Performed action";
      const type = typeMap[log.action?.toLowerCase() || ""] || "info";

      return {
        id: log.id,
        action: `${action} ${log.entity}`,
        actor: "System User",
        timestamp: log.createdAt,
        type,
      };
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

