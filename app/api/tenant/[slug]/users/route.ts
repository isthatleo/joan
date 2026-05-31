import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getTenantAccess, tenantAccessResponse } from "@/lib/api/tenant-access";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeRole(value?: string | null) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const access = await getTenantAccess(request, slug);
    if (!access.ok || !access.tenant) return tenantAccessResponse(access);

    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        avatar: users.avatar,
        baseRole: users.role,
        linkedRole: roles.name,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(users.tenantId, access.tenant.id))
      .orderBy(asc(users.fullName), asc(users.email));

    const byId = new Map<string, any>();
    for (const row of rows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, {
          id: row.id,
          fullName: row.fullName || row.email,
          email: row.email,
          phone: row.phone,
          avatar: row.avatar,
          role: normalizeRole(row.baseRole),
          roles: new Set<string>([normalizeRole(row.baseRole)].filter(Boolean)),
          isActive: row.isActive !== false,
          createdAt: row.createdAt?.toISOString?.() || row.createdAt,
          lastActive: row.updatedAt?.toISOString?.() || row.createdAt?.toISOString?.() || null,
        });
      }
      const item = byId.get(row.id);
      const linkedRole = normalizeRole(row.linkedRole);
      if (linkedRole) item.roles.add(linkedRole);
    }

    const payload = Array.from(byId.values()).map((user) => ({
      ...user,
      roles: Array.from(user.roles),
      role: Array.from(user.roles)[0] || user.role || "staff",
    }));

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Error fetching tenant users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
