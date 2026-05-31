import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labOrders, labResults } from "@/lib/db/schema";
import { eq, and, type SQL } from "drizzle-orm";
import { requireTenantUser } from "@/lib/api/route-guards";

export async function GET(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor", "lab_technician", "hospital_admin"]);
    if (!access.ok) return access.response;
    const tenantId = access.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get("visitId");
    const status = searchParams.get("status");

    const conditions: SQL[] = [eq(labOrders.tenantId, tenantId)];

    if (visitId) {
      conditions.push(eq(labOrders.visitId, visitId));
    }

    if (status) {
      conditions.push(eq(labOrders.status, status));
    }

    const orders = conditions.length
      ? await db.select().from(labOrders).where(and(...conditions))
      : await db.select().from(labOrders);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching lab orders:", error);
    return NextResponse.json({ error: "Failed to fetch lab orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["doctor"]);
    if (!access.ok) return access.response;
    const tenantId = access.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 403 });

    const data = await request.json();
    const { visitId, orderedBy, tests, notes } = data;

    if (!visitId || !orderedBy || !tests) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [order] = await db.insert(labOrders).values({
      tenantId,
      visitId,
      orderedBy: access.user.id,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating lab order:", error);
    return NextResponse.json({ error: "Failed to create lab order" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const access = await requireTenantUser(request, ["lab_technician"]);
    if (!access.ok) return access.response;
    const tenantId = access.user.tenantId;
    if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lab order ID required" }, { status: 400 });
    }

    const data = await request.json();
    const { status, results } = data;

    const [order] = await db.update(labOrders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(labOrders.id, id), eq(labOrders.tenantId, tenantId)))
      .returning();

    // If results are provided, create lab results
    if (results && status === "completed") {
      await db.insert(labResults).values({
        labOrderId: id,
        resultData: results,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating lab order:", error);
    return NextResponse.json({ error: "Failed to update lab order" }, { status: 500 });
  }
}

