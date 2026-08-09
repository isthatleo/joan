import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAppUser } from "@/lib/api/route-guards";

function isSuperAdmin(role: string | null) {
  return String(role || "").toLowerCase() === "super_admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const access = await requireAppUser(request);
    if (!access.ok) return access.response;
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantDepartments = await db.query.departments.findMany({
      where: eq(departments.tenantId, tenantId),
    });

    return NextResponse.json(tenantDepartments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;

    const data = await request.json();
    const { tenantId, name } = data;

    if (!tenantId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [department] = await db.insert(departments).values({
      tenantId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Department ID required" }, { status: 400 });
    }

    const existing = await db.query.departments.findFirst({ where: eq(departments.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== existing.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const { name } = data;

    const [department] = await db.update(departments)
      .set({ name, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();

    return NextResponse.json(department);
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireAppUser(request, ["super_admin", "hospital_admin"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Department ID required" }, { status: 400 });
    }

    const existing = await db.query.departments.findFirst({ where: eq(departments.id, id) });
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (!isSuperAdmin(access.user.role) && access.user.tenantId !== existing.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(departments).where(eq(departments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
